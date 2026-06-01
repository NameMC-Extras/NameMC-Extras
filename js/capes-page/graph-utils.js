// Cape usage graph utilities

const apiBase = 'https://cors.faav.top/fyz';

// Debounce helper function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Function to format numbers with commas (e.g., 1000000 -> 1,000,000)
function formatNumber(number) {
  if (typeof number !== 'number' || isNaN(number)) {
    return number;
  }
  return number.toLocaleString();
}

// Compact number formatter used for axis labels to avoid overflowing the left padding.
// e.g. 1_234_567 -> "1.2M", 340_000 -> "340K", 1_500_000_000 -> "1.5B".
function formatAxisNumber(number) {
  if (typeof number !== 'number' || isNaN(number)) {
    return number;
  }
  const abs = Math.abs(number);
  const sign = number < 0 ? '-' : '';
  const trim = (n) => {
    const s = n.toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  };
  if (abs >= 1e9) return `${sign}${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${trim(abs / 1e3)}K`;
  return `${sign}${abs}`;
}

// Detect the deprecation header so we get alerted if we accidentally hit a legacy endpoint
function checkDeprecationHeader(response) {
  try {
    if (response && response.headers && response.headers.get('x-deprecated') === 'true') {
      console.warn(
        'FyzCapesAPI endpoint is deprecated:',
        response.headers.get('x-deprecated-info')
      );
    }
  } catch (e) {
    // Some CORS proxies hide headers; ignore silently
  }
}

// Shared data processing function (v2 columnar format)
function processApiData(data, capeId) {
  // v2 response shape: { capeId, name, t: [ms, ...], c: [count, ...] }
  if (!data || !Array.isArray(data.t) || !Array.isArray(data.c)) {
    throw new Error(`Invalid API response: expected columnar { t, c } arrays, got ${typeof data}`);
  }
  
  if (data.t.length === 0) {
    return [];
  }
  
  // t[i] and c[i] are parallel arrays already ordered by timestamp ascending
  const formattedData = data.t.map((ts, i) => ({
    timestamp: new Date(parseInt(ts)),
    users: typeof data.c[i] === 'number' ? data.c[i] : 0
  }));
  
  // Validate and clean the data
  const validData = formattedData.filter(point => {
    const isValidTimestamp = point.timestamp instanceof Date && !isNaN(point.timestamp.getTime());
    const isValidUsers = typeof point.users === 'number' && !isNaN(point.users) && point.users >= 0;
    return isValidTimestamp && isValidUsers;
  });
  
  return validData;
}

// Main CapeUsageGraph class
class CapeUsageGraph {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = [];
    this.options = Object.assign({
      timeframe: 'week', // day, week, month, year, all
      lineColor: '#007bff',
      gridColor: '#e9ecef',
      textColor: '#495057',
      padding: 40,
      animationDuration: 500,
      pointRadius: 3,
      tooltipContainer: document.getElementById('tooltip'),
      hoverRadius: 10,
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      hoverLineElement: document.getElementById('hover-line'),
      hoverValueElement: document.getElementById('hover-value'),
      simplified: false,
      statElements: {
        current: document.getElementById('stat-current'),
        max: document.getElementById('stat-max'),
        min: document.getElementById('stat-min')
      }
    }, options);
    
    this.startTimestamp = null;
    this.endTimestamp = null;
    this.maxUsers = 0;
    this.minUsers = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.viewportStart = 0;
    this.viewportEnd = 1;
    this.zoomLevel = 1;
    this.hoverPoint = null;
    this.lastHoverPosition = { x: 0, y: 0 };
    
    // For dynamic data loading
    this.capeId = options.capeId || 'unknown';
    this.lastFetchedViewport = { start: 0, end: 0 };
    this.fullyLoaded = false;
    this.fetchPadding = 0.3; // Fetch 30% more data on each side
    this.isFetching = false;
    this.pendingFetch = false;
    this.fetchDebounceDelay = 500; // ms to wait before fetching
    this.debouncedFetchData = debounce(this._fetchDataForViewport.bind(this), this.fetchDebounceDelay);
    
    // Make canvas responsive
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Add event listeners if not simplified
    if (!this.options.simplified) {
      this.addEventListeners();
    }
    
    // Initialize tooltips
    this.initTooltips();
  }
  
  initTooltips() {
    // Get the graph container
    this.graphContainer = this.canvas.parentElement;
    
    // Create the tooltip container for the simplified view if it doesn't already exist
    if (!this.options.tooltipContainer) {
      const tooltipContainer = document.createElement('div');
      tooltipContainer.id = `tooltip-${Date.now()}`;
      tooltipContainer.className = 'graph-tooltip';
      tooltipContainer.style.position = 'absolute';
      tooltipContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
      tooltipContainer.style.color = 'white';
      tooltipContainer.style.padding = '5px 10px';
      tooltipContainer.style.borderRadius = '4px';
      tooltipContainer.style.fontSize = '12px';
      tooltipContainer.style.pointerEvents = 'none';
      tooltipContainer.style.zIndex = '1000';
      tooltipContainer.style.display = 'none';
      tooltipContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      tooltipContainer.style.transform = 'translate(-50%, -100%)';
      tooltipContainer.style.marginTop = '-10px';
      tooltipContainer.style.width = 'auto';
      tooltipContainer.style.maxWidth = '220px';
      tooltipContainer.style.whiteSpace = 'nowrap';
      this.graphContainer.appendChild(tooltipContainer);
      this.options.tooltipContainer = tooltipContainer;
    }
    
    // Ensure the tooltip container has the right styles
    if (this.options.tooltipContainer) {
      this.options.tooltipContainer.style.position = 'absolute';
      this.options.tooltipContainer.style.pointerEvents = 'none';
      
      // Check that the tooltip's parent is the graph container
      if (this.options.tooltipContainer.parentElement !== this.graphContainer) {
        // Move the tooltip into the graph container if it's not already there
        this.graphContainer.appendChild(this.options.tooltipContainer);
      }
    }
  }
  
  // method to position a tooltip relative to a point
  positionTooltip(tooltip, x, y, content) {
    if (!tooltip) return;
    
    const graphRect = this.graphContainer.getBoundingClientRect();
    
    // Update the tooltip content
    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
    
    // Default position - centered above the point
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    
    // Get the dimensions of the tooltip after rendering it visible
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Check if the tooltip exceeds the left
    if (tooltipRect.left < 0) {
      tooltip.style.left = `${Math.max(tooltipRect.width / 2, x)}px`;
    }
    
    // Check if the tooltip exceeds the right
    if (tooltipRect.right > window.innerWidth) {
      tooltip.style.left = `${Math.min(window.innerWidth - tooltipRect.width / 2, x)}px`;
    }
    
    // Check if the tooltip exceeds the top
    if (tooltipRect.top < 0) {
      // Place the tooltip below the point instead of above
      tooltip.style.transform = 'translate(-50%, 10px)';
      tooltip.style.marginTop = '0';
    } else {
      // Normal position (above)
      tooltip.style.transform = 'translate(-50%, -100%)';
      tooltip.style.marginTop = '-10px';
    }
    
    // Add the tooltip arrow
    this.updateTooltipArrow(tooltip);
  }
  
  updateTooltipArrow(tooltip) {
    // Remove the old arrow if it exists
    const oldArrow = tooltip.querySelector('.tooltip-arrow');
    if (oldArrow) {
      oldArrow.remove();
    }
    
    // Create a new arrow
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';
    arrow.style.position = 'absolute';
    arrow.style.width = '0';
    arrow.style.height = '0';
    
    // According to the tooltip position (above or below)
    if (tooltip.style.transform.includes('-100%')) {
      // Arrow pointing down (for a tooltip above)
      arrow.style.bottom = '-5px';
      arrow.style.left = '50%';
      arrow.style.marginLeft = '-5px';
      arrow.style.borderLeft = '5px solid transparent';
      arrow.style.borderRight = '5px solid transparent';
      arrow.style.borderTop = '5px solid rgba(0,0,0,0.8)';
    } else {
      // Arrow pointing up (for a tooltip below)
      arrow.style.top = '-5px';
      arrow.style.left = '50%';
      arrow.style.marginLeft = '-5px';
      arrow.style.borderLeft = '5px solid transparent';
      arrow.style.borderRight = '5px solid transparent';
      arrow.style.borderBottom = '5px solid rgba(0,0,0,0.8)';
    }
    
    tooltip.appendChild(arrow);
  }
  
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set canvas dimensions to match container
    this.canvas.width = container.clientWidth * devicePixelRatio;
    this.canvas.height = container.clientHeight * devicePixelRatio;
    
    // Scale the context to ensure correct drawing operations
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Redraw if we have data
    if (this.data.length > 0) {
      this.draw();
    }
  }
  
  setData(data) {
    // Data format: Array of {timestamp: Date, users: number}
    this.data = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (this.data.length > 0) {
      this.startTimestamp = this.data[0].timestamp;
      this.endTimestamp = this.data[this.data.length - 1].timestamp;
      this.recomputeUserBounds();
      
      if (!this.viewportStart || !this.viewportEnd) {
        this.setTimeframe(this.options.timeframe);
      }
    }
    
    // Since getCapeUsageData preloads the full history [0, now] in one shot,
    // mark the graph as fully loaded so panning/zooming never triggers a refetch.
    this.fullyLoaded = true;
    this.lastFetchedViewport = { start: 0, end: Date.now() };
    
    this.draw();
  }
  
  recomputeUserBounds() {
    if (!this.data || this.data.length === 0) return;
    let max = -Infinity;
    let min = Infinity;
    for (const point of this.data) {
      if (point.users > max) max = point.users;
      if (point.users < min) min = point.users;
    }
    this.minUsers = Math.max(0, min);
    this.maxUsers = Math.max(1, Math.ceil(Math.max(0, max) * 1.1));
  }
  
  setTimeframe(timeframe) {
    this.options.timeframe = timeframe;
    
    if (!this.data.length) {
      // Set reasonable default viewport when there's no data
      const now = new Date();
      this.viewportStart = Math.floor(new Date(now - 30 * 24 * 60 * 60 * 1000).getTime()); // 30 days ago
      this.viewportEnd = Math.floor(now.getTime());
      this.draw();
      return;
    }
    
    const now = new Date();
    switch (timeframe) {
      case 'day':
        this.viewportStart = Math.floor(new Date(now - 24 * 60 * 60 * 1000).getTime());
        break;
      case 'week':
        this.viewportStart = Math.floor(new Date(now - 7 * 24 * 60 * 60 * 1000).getTime());
        break;
      case 'month':
        this.viewportStart = Math.floor(new Date(now - 30 * 24 * 60 * 60 * 1000).getTime());
        break;
      case 'year':
        this.viewportStart = Math.floor(new Date(now - 365 * 24 * 60 * 60 * 1000).getTime());
        break;
      case 'all':
      default: {
        const startMs = Math.max(
          this.startTimestamp.getTime(),
          new Date('2010-01-01').getTime()
        );
        const span = Math.max(1, now.getTime() - startMs);
        // Pad ~3% on the left so the very first sample isn't pinned against the edge
        this.viewportStart = Math.floor(startMs - span * 0.03);
        break;
      }
    }
    
    this.viewportEnd = Math.floor(now.getTime());
    
    // Only invalidate the fetched range cache if we haven't preloaded the full history.
    if (!this.fullyLoaded) {
      this.lastFetchedViewport = { start: 0, end: 0 };
    }
    
    this.validateViewport(); // Apply additional constraints
    this.draw();
  }
  
  // Build the data series used to draw the line/area.
  // The series always extends one point past each viewport edge (when available) so the line
  // stays connected to off-screen neighbours instead of being clipped to a lone dot.
  // If the viewport contains no real point but a previous point exists, we materialize a
  // carry-forward segment (RLE semantics: the count stays at c[i-1] until the next sample).
  buildPlotData() {
    const data = this.data;
    if (!data || data.length === 0) {
      return { plotData: [], pointsInView: [], statsData: [] };
    }
    
    let firstIn = -1;
    let lastIn = -1;
    for (let i = 0; i < data.length; i++) {
      const ts = data[i].timestamp.getTime();
      if (ts >= this.viewportStart && ts <= this.viewportEnd) {
        if (firstIn === -1) firstIn = i;
        lastIn = i;
      } else if (ts > this.viewportEnd) {
        break;
      }
    }
    
    // Locate the last point strictly before the viewport (for carry-forward)
    let prevIdx = -1;
    const searchEnd = firstIn === -1 ? data.length : firstIn;
    for (let i = searchEnd - 1; i >= 0; i--) {
      if (data[i].timestamp.getTime() < this.viewportStart) {
        prevIdx = i;
        break;
      }
    }
    
    // Locate the first point strictly after the viewport
    let nextIdx = -1;
    const searchStart = lastIn === -1 ? 0 : lastIn + 1;
    for (let i = searchStart; i < data.length; i++) {
      if (data[i].timestamp.getTime() > this.viewportEnd) {
        nextIdx = i;
        break;
      }
    }
    
    const pointsInView = firstIn === -1 ? [] : data.slice(firstIn, lastIn + 1);
    
    if (pointsInView.length === 0 && prevIdx === -1) {
      return { plotData: [], pointsInView: [], statsData: [] };
    }
    
    // Case A: at least one real point is visible -> just extend with neighbours
    if (pointsInView.length > 0) {
      const plotData = [];
      if (prevIdx !== -1) {
        plotData.push({
          timestamp: data[prevIdx].timestamp,
          users: data[prevIdx].users,
          _boundary: true
        });
      }
      for (const pt of pointsInView) plotData.push(pt);
      if (nextIdx !== -1) {
        plotData.push({
          timestamp: data[nextIdx].timestamp,
          users: data[nextIdx].users,
          _boundary: true
        });
      } else {
        // No real successor: carry-forward the last in-view value up to the right edge
        // so unzooming past the last sample doesn't leave a half-empty graph.
        const last = pointsInView[pointsInView.length - 1];
        const rightEdge = Math.min(this.viewportEnd, Date.now());
        if (rightEdge > last.timestamp.getTime()) {
          plotData.push({
            timestamp: new Date(rightEdge),
            users: last.users,
            _boundary: true,
            _synthetic: true
          });
        }
      }
      return { plotData, pointsInView, statsData: pointsInView };
    }
    
    // Case B: no point in viewport but a previous one exists -> draw flat carry-forward line.
    // It runs from viewportStart to either viewportEnd or the next out-of-view point.
    const carryUsers = data[prevIdx].users;
    const rightTs = nextIdx !== -1 ? data[nextIdx].timestamp.getTime() : this.viewportEnd;
    const synthLeft = {
      timestamp: new Date(this.viewportStart),
      users: carryUsers,
      _boundary: true,
      _synthetic: true
    };
    const synthRight = {
      timestamp: new Date(rightTs),
      users: nextIdx !== -1 ? data[nextIdx].users : carryUsers,
      _boundary: true,
      _synthetic: true
    };
    // Stats reflect the carry-forward value
    const statsData = [{
      timestamp: new Date(this.viewportEnd),
      users: carryUsers
    }];
    return { plotData: [synthLeft, synthRight], pointsInView: [], statsData };
  }
  
  draw() {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.width / dpr;
    const displayHeight = this.canvas.height / dpr;
    
    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    // If no data at all, just draw an empty graph with grid and axes
    if (!this.data.length) {
      // Set default max users for empty graph
      this.maxUsers = 100;
      this.drawGrid(displayWidth, displayHeight);
      this.drawAxes(displayWidth, displayHeight);
      return;
    }
    
    const { plotData, pointsInView, statsData } = this.buildPlotData();
    
    // Nothing relevant at all (no point in viewport AND no previous point to carry forward)
    if (plotData.length === 0) {
      this.drawGrid(displayWidth, displayHeight);
      this.drawAxes(displayWidth, displayHeight);
      
      if (!this.isFetching) {
        this.fetchDataForViewport();
      }
      return;
    }
    
    this.drawGrid(displayWidth, displayHeight);
    this.drawAxes(displayWidth, displayHeight);
    
    // For simplified view with many points, downsample only the in-viewport part
    // (keep the boundary endpoints untouched so the line never gets disconnected).
    let dataToPlot = plotData;
    if (this.options.simplified && pointsInView.length > 200) {
      const head = plotData[0]._boundary ? [plotData[0]] : [];
      const tail = plotData[plotData.length - 1]._boundary ? [plotData[plotData.length - 1]] : [];
      const middle = this.simplifyData(pointsInView, 100);
      dataToPlot = [...head, ...middle, ...tail];
    }
    
    // Clip line + area to the plotting area so boundary segments don't bleed onto
    // the Y-axis labels (left), the X-axis labels (bottom) or past the chart edges.
    const p = this.options.padding;
    ctx.save();
    ctx.beginPath();
    ctx.rect(p, p, displayWidth - 2 * p, displayHeight - 2 * p);
    ctx.clip();
    
    ctx.beginPath();
    ctx.strokeStyle = this.options.lineColor;
    ctx.lineWidth = 2;
    
    dataToPlot.forEach((point, i) => {
      const x = this.timeToX(point.timestamp, displayWidth);
      const y = this.userCountToY(point.users, displayHeight);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Only dots inside the viewport get drawn (no markers for boundary / synthetic points)
    this.drawPoints(dataToPlot, displayWidth, displayHeight);
    
    // Floating marker on the line at the cursor position (interpolated hover)
    if (this.hoverPoint && this.hoverPoint._interpolated) {
      const hx = this.hoverPoint.x;
      const hy = this.hoverPoint.y;
      ctx.beginPath();
      ctx.arc(hx, hy, this.options.pointRadius + 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, hy, this.options.pointRadius + 2, 0, Math.PI * 2);
      ctx.fillStyle = `${this.options.lineColor}40`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, hy, this.options.pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.options.lineColor;
      ctx.fill();
    }
    
    ctx.restore();
    
    this.drawStats(statsData, displayWidth, displayHeight);
  }
  
  drawGrid(width, height) {
    const ctx = this.ctx;
    const p = this.options.padding;
    
    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 1;
    
    // Horizontal grid lines - simplify for small graph
    const userStep = Math.ceil(this.maxUsers / (this.options.simplified ? 2 : 5));
    for (let i = 0; i <= this.maxUsers; i += userStep) {
      const y = this.userCountToY(i, height);
      ctx.beginPath();
      ctx.moveTo(p, y);
      ctx.lineTo(width - p, y);
      ctx.stroke();
      
      // Label - skip most labels for simplified view but show min and max
      if (!this.options.simplified || i === 0 || i === this.maxUsers) {
        ctx.fillStyle = this.options.textColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = `12px ${this.options.fontFamily}`;
        ctx.fillText(formatAxisNumber(i), p - 6, y);
      }
    }
    
    // Vertical grid lines
    const timeRange = this.viewportEnd - this.viewportStart;
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;
    const YEAR = 365 * DAY;
    let timeStep, format, avgLabelWidth;
    
    if (timeRange < DAY) {
      timeStep = HOUR;
      format = time => time.getHours() + ':00';
      avgLabelWidth = 50;
    } else if (timeRange < 7 * DAY) {
      timeStep = DAY;
      format = time => time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      avgLabelWidth = 60;
    } else if (timeRange < 30 * DAY) {
      timeStep = 7 * DAY;
      format = time => time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      avgLabelWidth = 60;
    } else if (timeRange < 2 * YEAR) {
      timeStep = 30 * DAY;
      format = time => time.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      avgLabelWidth = 80;
    } else {
      // Very wide window: yearly grid only
      timeStep = YEAR;
      format = time => time.getFullYear().toString();
      avgLabelWidth = 50;
    }
    
    const startTime = new Date(this.viewportStart);
    startTime.setHours(0, 0, 0, 0);
    
    // Calculate how many labels would fit in the available width
    const availableWidth = width - 2 * p;
    const maxLabels = Math.max(1, Math.floor(availableWidth / avgLabelWidth));
    
    // Count potential labels
    let labelCount = 0;
    for (let timestamp = startTime.getTime(); timestamp <= this.viewportEnd; timestamp += timeStep) {
      labelCount++;
    }
    
    // Skip factor harmonized between lines and labels so the grid never gets cluttered.
    const skipFactor = Math.max(
      this.options.simplified ? 3 : 1,
      Math.ceil(labelCount / maxLabels)
    );
    
    let firstTime = null;
    let lastTime = null;
    let lineCounter = 0;
    
    // X grid lines drawn slightly more subtle than the horizontal grid (lower alpha) so
    // a wide unzoom doesn't drown the chart in vertical bars.
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 1;
    
    for (let timestamp = startTime.getTime(); timestamp <= this.viewportEnd; timestamp += timeStep) {
      lineCounter++;
      
      if (firstTime === null) firstTime = new Date(timestamp);
      lastTime = new Date(timestamp);
      
      const isFirstOrLast = lineCounter === 1 || timestamp + timeStep > this.viewportEnd;
      const shouldDraw = isFirstOrLast || lineCounter % skipFactor === 0;
      
      // Lines and labels are now perfectly aligned: an unlabeled line would just be visual noise.
      if (!shouldDraw) continue;
      
      const time = new Date(timestamp);
      const x = this.timeToX(time, width);
      
      // Skip the leftmost vertical line if it's too close to the Y axis
      if (x <= p + 15) continue;
      
      ctx.beginPath();
      ctx.moveTo(x, p);
      ctx.lineTo(x, height - p);
      ctx.stroke();
      
      if (!this.options.simplified || isFirstOrLast) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.options.textColor;
        ctx.textBaseline = 'top';
        ctx.font = `12px ${this.options.fontFamily}`;
        const label = format(time);
        // Anchor edge labels inside the canvas (left/right aligned) so the first and last
        // numbers are never clipped, including in the wider fullscreen/modal view.
        const halfWidth = ctx.measureText(label).width / 2;
        const edgeMargin = 4;
        if (x - halfWidth < edgeMargin) {
          ctx.textAlign = 'left';
          ctx.fillText(label, edgeMargin, height - p + 5);
        } else if (x + halfWidth > width - edgeMargin) {
          ctx.textAlign = 'right';
          ctx.fillText(label, width - edgeMargin, height - p + 5);
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(label, x, height - p + 5);
        }
        ctx.restore();
      }
    }
    
    ctx.restore();
    
    // In simplified mode, always ensure first and last dates are shown
    if (this.options.simplified && firstTime && lastTime) {
      const firstX = this.timeToX(firstTime, width);
      const lastX = this.timeToX(lastTime, width);
      
      // Only draw if not already drawn and there's enough space between
      if (firstX > p + 15 && lastX - firstX > 60) {
        ctx.fillStyle = this.options.textColor;
        ctx.textBaseline = 'top';
        ctx.font = `12px ${this.options.fontFamily}`;
        
        const edgeMargin = 4;
        const drawEdgeLabel = (label, x) => {
          // Anchor edge labels inside the canvas so the first/last numbers are never clipped.
          const halfWidth = ctx.measureText(label).width / 2;
          if (x - halfWidth < edgeMargin) {
            ctx.textAlign = 'left';
            ctx.fillText(label, edgeMargin, height - p + 5);
          } else if (x + halfWidth > width - edgeMargin) {
            ctx.textAlign = 'right';
            ctx.fillText(label, width - edgeMargin, height - p + 5);
          } else {
            ctx.textAlign = 'center';
            ctx.fillText(label, x, height - p + 5);
          }
        };
        
        // First date
        drawEdgeLabel(format(firstTime), firstX);
        
        // Last date
        drawEdgeLabel(format(lastTime), lastX);
      }
    }
  }
  
  drawAxes(width, height) {
    const ctx = this.ctx;
    const p = this.options.padding;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(p, height - p);
    ctx.lineTo(width - p, height - p);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(p, p);
    ctx.lineTo(p, height - p);
    ctx.stroke();
    
    // Axis labels - skip for simplified view
    if (!this.options.simplified) {
      ctx.fillStyle = this.options.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 12px ${this.options.fontFamily}`;
      
      // X axis label
      ctx.fillText('Time', width / 2, height - 10);
      
      // Y axis label
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Users', 0, 0);
      ctx.restore();
    }
  }
  
  drawStats(visibleData, width, height) {
    if (!visibleData.length) return;
    
    const ctx = this.ctx;
    const p = this.options.padding;
    
    const currentUsers = Math.max(0, visibleData[visibleData.length - 1].users);
    const maxUsers = Math.max(0, Math.max(...visibleData.map(d => d.users)));
    const minUsers = Math.max(0, Math.min(...visibleData.map(d => d.users)));
    
    // Update stats in the HTML
    const { statElements } = this.options;
    if (statElements) {
      if (statElements.current) statElements.current.textContent = formatNumber(currentUsers);
      if (statElements.max) statElements.max.textContent = formatNumber(maxUsers);
      if (statElements.min) statElements.min.textContent = formatNumber(minUsers);
    }
    
    // For simplified view, add more data points and display more information
    if (this.options.simplified) {
      // Calculate additional statistics
      let maxPoint = visibleData[0];
      let minPoint = visibleData[0];
      
      for (const point of visibleData) {
        if (point.users > maxPoint.users) maxPoint = point;
        if (point.users < minPoint.users) minPoint = point;
      }
      
      // Draw more horizontal grid lines
      const userStep = Math.ceil(this.maxUsers / 5); // Show 5 grid lines regardless of simplified view
      for (let i = userStep; i < this.maxUsers; i += userStep) {
        const y = this.userCountToY(i, height);
        
        // Draw dotted grid line
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(p, y);
        ctx.lineTo(width - p, y);
        ctx.strokeStyle = this.options.gridColor;
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Label for intermediate values
        ctx.fillStyle = this.options.textColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = `11px ${this.options.fontFamily}`;
        ctx.fillText(formatAxisNumber(i), p - 4, y);
      }
      
      // Just store min/max points for tooltip without drawing special indicators
      this.maxPointInfo = {
        x: this.timeToX(maxPoint.timestamp, width),
        y: this.userCountToY(maxPoint.users, height),
        users: maxPoint.users,
        timestamp: maxPoint.timestamp
      };
      
      this.minPointInfo = {
        x: this.timeToX(minPoint.timestamp, width),
        y: this.userCountToY(minPoint.users, height),
        users: minPoint.users,
        timestamp: minPoint.timestamp
      };
    }
  }
  
  timeToX(time, width) {
    const p = this.options.padding;
    const timestamp = time instanceof Date ? time.getTime() : time;
    
    return p + (timestamp - this.viewportStart) / (this.viewportEnd - this.viewportStart) * (width - 2 * p);
  }
  
  userCountToY(users, height) {
    const p = this.options.padding;
    
    return height - p - (users / this.maxUsers) * (height - 2 * p);
  }
  
  xToTime(x, width) {
    const p = this.options.padding;
    width = width || (this.canvas.width / (window.devicePixelRatio || 1));
    
    const percent = (x - p) / (width - 2 * p);
    return this.viewportStart + percent * (this.viewportEnd - this.viewportStart);
  }
  
  yToUserCount(y, height) {
    const p = this.options.padding;
    height = height || (this.canvas.height / (window.devicePixelRatio || 1));
    
    return this.maxUsers * (1 - (y - p) / (height - 2 * p));
  }
  
  // Linearly interpolate the user count at the given mouse X position so the tooltip can
  // display a "predicted" value between two real samples. Outside the data range we use the
  // carry-forward value (the same semantics as the v2 RLE format).
  // When the cursor is within SNAP_PX pixels of a real sample, snap to it so the tooltip
  // shows the exact recorded value instead of an interpolated one.
  computeHoverAtX(mouseX, displayWidth, displayHeight, visibleData) {
    if (!visibleData || visibleData.length === 0) return null;
    
    const SNAP_PX = 12;
    const timeAtMouse = this.xToTime(mouseX, displayWidth);
    
    const buildExact = (point) => ({
      timestamp: point.timestamp,
      users: point.users,
      x: this.timeToX(point.timestamp, displayWidth),
      y: this.userCountToY(point.users, displayHeight)
    });
    
    if (visibleData.length === 1) {
      return buildExact(visibleData[0]);
    }
    
    // Binary search for the first index with timestamp >= timeAtMouse
    let lo = 0, hi = visibleData.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (visibleData[mid].timestamp.getTime() < timeAtMouse) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    
    // Try to snap to whichever neighbour is closest in screen-space
    const candidate = visibleData[lo];
    const candidateX = this.timeToX(candidate.timestamp, displayWidth);
    let snapPoint = candidate;
    let snapX = candidateX;
    let snapDx = Math.abs(mouseX - candidateX);
    if (lo > 0) {
      const prev = visibleData[lo - 1];
      const prevX = this.timeToX(prev.timestamp, displayWidth);
      const prevDx = Math.abs(mouseX - prevX);
      if (prevDx < snapDx) {
        snapPoint = prev;
        snapX = prevX;
        snapDx = prevDx;
      }
    }
    if (snapDx <= SNAP_PX) {
      return {
        timestamp: snapPoint.timestamp,
        users: snapPoint.users,
        x: snapX,
        y: this.userCountToY(snapPoint.users, displayHeight)
      };
    }
    
    // Otherwise: interpolate or carry-forward
    let left = null;
    let right = null;
    if (lo === 0) {
      right = visibleData[0];
    } else if (visibleData[lo].timestamp.getTime() > timeAtMouse) {
      left = visibleData[lo - 1];
      right = visibleData[lo];
    } else {
      left = visibleData[lo];
    }
    
    if (left && right) {
      const lt = left.timestamp.getTime();
      const rt = right.timestamp.getTime();
      const t = (timeAtMouse - lt) / (rt - lt);
      const raw = Math.max(0, left.users + t * (right.users - left.users));
      const interpolated = Math.round(raw);
      return {
        timestamp: new Date(timeAtMouse),
        users: interpolated,
        x: mouseX,
        y: this.userCountToY(raw, displayHeight),
        _interpolated: true
      };
    }
    
    // Cursor is past the last point or before the first: carry-forward / carry-back
    const anchor = left || right;
    return {
      timestamp: new Date(timeAtMouse),
      users: anchor.users,
      x: mouseX,
      y: this.userCountToY(anchor.users, displayHeight),
      _interpolated: true
    };
  }
  
  addEventListeners() {
    // Mouse wheel for zooming
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // Calculate time at mouse position
      const timeAtMouse = this.xToTime(mouseX);
      
      // Zoom factor
      const factor = e.deltaY < 0 ? 0.9 : 1.1;
      
      // Apply zoom
      const timeRange = this.viewportEnd - this.viewportStart;
      const newTimeRange = timeRange * factor;
      
      // Calculate new viewport limits
      const mousePercent = (timeAtMouse - this.viewportStart) / timeRange;
      let newStart = timeAtMouse - mousePercent * newTimeRange;
      let newEnd = newStart + newTimeRange;
      
      // Update viewport
      this.viewportStart = newStart;
      this.viewportEnd = newEnd;
      
      // Apply constraints
      this.validateViewport();
      
      this.draw();
    });
    
    // Mouse drag for panning
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.isDragging = true;
      this.dragStart = {
        x: e.clientX - rect.left,
        timeStart: this.viewportStart,
        timeEnd: this.viewportEnd
      };
    });
    
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const dx = mouseX - this.dragStart.x;
        
        // Convert pixel movement to time delta
        const displayWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const timeRange = this.dragStart.timeEnd - this.dragStart.timeStart;
        const timeDelta = -dx / (displayWidth - 2 * this.options.padding) * timeRange;
        
        // Calculate new viewport times
        this.viewportStart = this.dragStart.timeStart + timeDelta;
        this.viewportEnd = this.dragStart.timeEnd + timeDelta;
        
        // Apply constraints
        this.validateViewport();
        
        this.draw();
      } else {
        // Handle hover effect
        this.handleMouseMove(e);
      }
    });
    
    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        
        // If there was a pending fetch request during dragging, execute it now
        if (this.pendingFetch) {
          this.fetchDataForViewport();
        }
      }
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      // Hide tooltip and hover elements when mouse leaves the canvas
      if (this.options.tooltipContainer) {
        this.options.tooltipContainer.style.display = 'none';
      }
      if (this.options.hoverLineElement) {
        this.options.hoverLineElement.style.display = 'none';
      }
      if (this.options.hoverValueElement) {
        this.options.hoverValueElement.style.display = 'none';
      }
      this.hoverPoint = null;
      this.draw();
    });
  }
  
  handleMouseMove(e) {
    if (this.isDragging) return;
    
    // First check if the graph is in a modal and if the modal is visible
    if (!this.options.simplified) {
      const modal = document.getElementById('graph-modal');
      if (modal && modal.style.display !== 'block') {
        // If the modal is not visible, ensure everything is hidden
        if (this.options.tooltipContainer) this.options.tooltipContainer.style.display = 'none';
        if (this.options.hoverLineElement) this.options.hoverLineElement.style.display = 'none';
        return;
      }
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const displayWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Check if hovering min/max indicators in simplified view
    if (this.options.simplified && this.data.length > 0) {
      // Check if mouse is near max point
      if (this.maxPointInfo || this.minPointInfo) {
        const distance = Math.sqrt(
          Math.pow(mouseX - this.maxPointInfo.x, 2) + 
          Math.pow(mouseY - this.maxPointInfo.y, 2)
        );
        
        if (distance <= 10) { // 10px hover radius
          const formattedDate = this.formatTooltipDate(this.maxPointInfo.timestamp);
          const tooltipContent = `
            <strong>Maximum:</strong> ${formatNumber(Math.max(0, this.maxPointInfo.users))} users<br>${formattedDate}
          `;

          this.positionTooltip(
            this.options.tooltipContainer, 
            this.maxPointInfo.x, 
            this.maxPointInfo.y, 
            tooltipContent
          );
          
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
      
      // Check if mouse is near min point
      if (this.minPointInfo) {
        const distance = Math.sqrt(
          Math.pow(mouseX - this.minPointInfo.x, 2) + 
          Math.pow(mouseY - this.minPointInfo.y, 2)
        );
        
        if (distance <= 10) { // 10px hover radius
          const formattedDate = this.formatTooltipDate(this.minPointInfo.timestamp);
          const tooltipContent = `
            <strong>Minimum:</strong> ${formatNumber(Math.max(0, this.minPointInfo.users))} users<br>${formattedDate}
          `;
          
          this.positionTooltip(
            this.options.tooltipContainer, 
            this.minPointInfo.x, 
            this.minPointInfo.y, 
            tooltipContent
          );
          
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
      
      // Hide tooltip if not hovering any special point
      if (this.options.tooltipContainer) {
        this.options.tooltipContainer.style.display = 'none';
      }
    }
    
    // Continue with the existing hover point detection
    const timeAtMouse = this.xToTime(mouseX, displayWidth);
    const mouseTimestamp = new Date(timeAtMouse);
    
    // Original hover code - find data point closest to mouse
    const visibleData = this.data.filter(d => {
      const timestamp = d.timestamp.getTime();
      return timestamp >= this.viewportStart && timestamp <= this.viewportEnd;
    });
    
    // Reset cursor if not over a special point
    if (this.canvas.style.cursor === 'pointer' && !this.isDragging) {
      this.canvas.style.cursor = 'default';
    }
    
    if (visibleData.length === 0) {
      this.hoverPoint = null;
      this.draw();
      return;
    }
    
    // Interpolate the user count at the cursor's X position so the tooltip follows the line
    // smoothly between samples (linear interpolation, carry-forward outside the data range).
    const hover = this.computeHoverAtX(mouseX, displayWidth, displayHeight, visibleData);
    
    const padding = this.options.padding;
    const isWithinGraphX =
      mouseX >= padding &&
      mouseX <= displayWidth - padding;
    
    const closestPoint = hover; // kept for the downstream branches that check truthiness
    const closestX = hover ? hover.x : 0;
    const closestY = hover ? hover.y : 0;
    
    // Different processing depending on whether we are in simplified or detailed view
    if (this.options.simplified) {
      if (hover && isWithinGraphX) {
        this.hoverPoint = hover;
        // Keep "pointer" cursor so a click still opens the modal
        this.canvas.style.cursor = 'pointer';
        
        const formattedDate = this.formatTooltipDate(hover.timestamp);
        const tooltipContent = `
          <strong>${formattedDate}</strong><br>
          ${formatNumber(Math.max(0, hover.users))} users
        `;
        
        this.positionTooltip(
          this.options.tooltipContainer,
          hover.x,
          hover.y,
          tooltipContent
        );
      } else {
        this.hoverPoint = null;
        if (this.options.tooltipContainer) {
          this.options.tooltipContainer.style.display = 'none';
        }
        this.canvas.style.cursor = 'pointer';
      }
    } else {
      // For the detailed view (modal)
      // Verify if the cursor is within the graph bounds (between the margins)
      const padding = this.options.padding;
      const isWithinGraphBounds = 
        mouseX >= padding && 
        mouseX <= displayWidth - padding && 
        mouseY >= padding && 
        mouseY <= displayHeight - padding;
      
      // Also check if the modal containing this graph is visible
      let isModalVisible = true;
      const modal = document.getElementById('graph-modal');
      if (modal) {
        isModalVisible = modal.style.display === 'block';
      }
      
      if (isWithinGraphBounds && closestPoint && isModalVisible) {
        this.hoverPoint = closestPoint;
        this.canvas.style.cursor = 'crosshair';
        
        // Display the detailed tooltip
        const formattedDate = this.formatDetailedTooltipDate(closestPoint.timestamp);
        const tooltipContent = `
          <div style="font-weight: bold;">${formattedDate}</div>
          <div>${formatNumber(Math.max(0, closestPoint.users))} users</div>
        `;

        this.positionTooltip(
          this.options.tooltipContainer,
          closestX,
          closestY,
          tooltipContent
        );
        
        // Show hover line at the position of the closest point
        if (this.options.hoverLineElement) {
          const hoverLine = this.options.hoverLineElement;
          hoverLine.style.display = 'block';
          hoverLine.style.left = `${closestX}px`;
          hoverLine.style.top = `${padding}px`;
          hoverLine.style.height = `${displayHeight - 2 * padding}px`;
          hoverLine.style.zIndex = '998';
          
          // Hide the value element that follows the curve
          if (this.options.hoverValueElement) {
            this.options.hoverValueElement.style.display = 'none';
          }
        }
      } else {
        // If outside graph bounds, hide tooltip and hover line
        if (this.options.tooltipContainer) {
          this.options.tooltipContainer.style.display = 'none';
        }
        if (this.options.hoverLineElement) {
          this.options.hoverLineElement.style.display = 'none';
        }
        this.hoverPoint = null;
      }
    }
    
    // Clean up when mouse leaves
    this.canvas.addEventListener('mouseleave', () => {
      if (this.options.tooltipContainer) {
        this.options.tooltipContainer.style.display = 'none';
      }
      if (this.options.hoverLineElement) {
        this.options.hoverLineElement.style.display = 'none';
      }
    });
    
    this.draw();
  }
  
  // Format date for tooltip based on timeframe
  formatTooltipDate(timestamp) {
    const date = new Date(timestamp);
    const timeRange = this.viewportEnd - this.viewportStart;
    
    if (timeRange < 24 * 60 * 60 * 1000) {
      // Less than a day, show hour:minute
      return date.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (timeRange < 7 * 24 * 60 * 60 * 1000) {
      // Less than a week, show day and time
      return date.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      // Otherwise date with time
      return date.toLocaleString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
  
  // More detailed date format for modal graph tooltip
  formatDetailedTooltipDate(timestamp) {
    const date = new Date(timestamp);
    const timeRange = this.viewportEnd - this.viewportStart;
    
    if (timeRange < 24 * 60 * 60 * 1000) {
      // Less than a day, show hour:minute:second
      return date.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } else if (timeRange < 7 * 24 * 60 * 60 * 1000) {
      // Less than a week, show day and time
      return date.toLocaleString(undefined, { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (timeRange < 30 * 24 * 60 * 60 * 1000) {
      // Less than a month
      return date.toLocaleString(undefined, { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } else {
      // More than a month
      return date.toLocaleString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
  
  // Helper method to simplify data points for better performance in simplified view
  simplifyData(data, targetPoints) {
    if (data.length <= targetPoints) return data;
    
    // For simplified view, use more data points
    const targetPointCount = this.options.simplified ? 100 : targetPoints;
    
    const skipFactor = Math.floor(data.length / targetPointCount);
    return data.filter((_, index) => index % skipFactor === 0);
  }
  
  
  // Add this new method to fetch data when viewport changes
  async fetchDataForViewport() {
    // If we're in the middle of dragging, just set a flag to fetch later
    if (this.isDragging) {
      this.pendingFetch = true;
      return;
    }
    
    // Use debounced fetch to avoid multiple requests during rapid interactions
    this.debouncedFetchData();
  }
  
  // Add this new method for the actual implementation
  async _fetchDataForViewport() {
    // No need to fetch if we don't have a Cape ID
    if (!this.capeId || this.capeId === 'unknown') return;
    
    // The full history is already preloaded in cache; no need to fetch anything else.
    if (this.fullyLoaded) return;
    
    // If already fetching, don't start another fetch
    if (this.isFetching) return;
    
    // Reset the pending fetch flag
    this.pendingFetch = false;
    
    // Calculate the time range currently visible
    const currentViewportRange = this.viewportEnd - this.viewportStart;
    
    // Define a threshold (e.g., 20% of the current viewport)
    const threshold = currentViewportRange * 0.2;
    
    // Check if we need to fetch more data
    const needToFetchStart = 
      !this.lastFetchedViewport.start || 
      this.viewportStart < this.lastFetchedViewport.start + threshold;
    
    const needToFetchEnd = 
      !this.lastFetchedViewport.end || 
      this.viewportEnd > this.lastFetchedViewport.end - threshold;
    
    // Only fetch if we actually need new data
    if (!needToFetchStart && !needToFetchEnd) return;
    
    // Calculate padding for fetching more data
    const padding = Math.floor(currentViewportRange * this.fetchPadding); // Ensure integer
    
    const nowMs = Date.now();
    const fetchStart = Math.floor(Math.max(
      0,
      this.viewportStart - padding
    ));
    const fetchEnd = Math.floor(Math.min(
      nowMs,
      this.viewportEnd + padding
    ));
    
    // Check if this request recently failed to avoid spamming failed requests
    if (window.capeDataCache && window.capeDataCache.hasRecentlyFailed(this.capeId, fetchStart, fetchEnd)) {
      return;
    }
    
    // Check if we already have this data in cache
    if (window.capeDataCache && window.capeDataCache.isTimeRangeCached(this.capeId, fetchStart, fetchEnd)) {
      const data = window.capeDataCache.getDataForTimeRange(this.capeId, fetchStart, fetchEnd);
      
      // Merge with existing data if needed
      if (this.data && this.data.length > 0) {
        const existingTimestamps = new Set(this.data.map(d => d.timestamp.getTime()));
        const newData = data.filter(d => !existingTimestamps.has(d.timestamp.getTime()));
        
        if (newData.length > 0) {
          this.data = [...this.data, ...newData].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          this.recomputeUserBounds();
          this.draw();
        }
      } else {
        this.setData(data);
      }
      
      // Update last fetched viewport
      this.lastFetchedViewport = {
        start: Math.min(this.lastFetchedViewport.start || Infinity, fetchStart),
        end: Math.max(this.lastFetchedViewport.end || 0, fetchEnd)
      };
      
      return;
    }
    
    this.isFetching = true;
    
    const showLoading = !this.data || this.data.length === 0;
    const graphLoadingIndicators = document.querySelectorAll('.graph-loading-indicator');
    if (showLoading) {
      graphLoadingIndicators.forEach(indicator => {
        indicator.style.display = 'flex';
      });
    }
    
    try {
      // Fetch data from API (v2 columnar endpoint)
      const apiUrl = `${apiBase}/v2/${this.capeId}/usage?start=${fetchStart}&end=${fetchEnd}`;
      
      const response = await fetch(apiUrl);
      
      // v2 returns 404 when the cape doesn't exist (legacy returned []); treat as empty
      if (response.status === 404) {
        if (showLoading) {
          document.querySelectorAll('.graph-loading-indicator').forEach(el => {
            el.style.display = 'none';
          });
        }
        this.lastFetchedViewport = {
          start: Math.min(this.lastFetchedViewport.start || Infinity, fetchStart),
          end: Math.max(this.lastFetchedViewport.end || 0, fetchEnd)
        };
        return;
      }
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      checkDeprecationHeader(response);
      
      const data = await response.json();
      
      // Process and validate the data using shared function
      const validData = processApiData(data, this.capeId);
      
      if (showLoading) {
        document.querySelectorAll('.graph-loading-indicator').forEach(el => {
          el.style.display = 'none';
        });
      }
      
      // Add to cache if available
      if (window.capeDataCache) {
        window.capeDataCache.addData(this.capeId, validData, fetchStart, fetchEnd);
      }
      
      // Merge with existing data
      if (this.data && this.data.length > 0) {
        const existingTimestamps = new Set(this.data.map(d => d.timestamp.getTime()));
        const newData = validData.filter(d => !existingTimestamps.has(d.timestamp.getTime()));
        
        if (newData.length > 0) {
          this.data = [...this.data, ...newData].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          this.recomputeUserBounds();
          this.draw();
        }
      } else {
        this.setData(validData);
      }
      
      // Update last fetched viewport
      this.lastFetchedViewport = {
        start: Math.min(this.lastFetchedViewport.start || Infinity, fetchStart),
        end: Math.max(this.lastFetchedViewport.end || 0, fetchEnd)
      };
      
    } catch (error) {
      console.error('Error fetching additional data:', error);
      
      // Record this as a failed request to avoid retrying too often
      if (window.capeDataCache) {
        window.capeDataCache.addFailedRequest(this.capeId, fetchStart, fetchEnd);
      }
      
      // Show error message to user
      if (showErrorMessage) {
        showErrorMessage(`Failed to load data for cape ${this.capeId}. Please try again later.`);
      }
      
      // In case of failure, we keep the existing data
    } finally {
      this.isFetching = false;
      
      if (showLoading) {
        graphLoadingIndicators.forEach(indicator => {
          indicator.style.display = 'none';
        });
      }
      
      this.draw();
      
      // If a fetch was requested while we were fetching, do it now
      if (this.pendingFetch) {
        setTimeout(() => this.fetchDataForViewport(), 0);
      }
    }
  }
  
  validateViewport() {
    const now = Math.floor(Date.now());
    const minAllowedTime = 0;
    const maxAllowedTime = now;
    
    this.viewportStart = Math.floor(Math.max(this.viewportStart, minAllowedTime));
    
    // Limit end time
    this.viewportEnd = Math.floor(Math.min(this.viewportEnd, maxAllowedTime));
    
    // Ensure the viewport isn't too small (min 1 hour)
    const minTimeRange = Math.floor(60 * 60 * 1000);
    if (this.viewportEnd - this.viewportStart < minTimeRange) {
      this.viewportEnd = Math.floor(this.viewportStart + minTimeRange);
    }
    
    // Fetch data for new viewport if needed
    this.fetchDataForViewport();
  }

  // Debug function to help troubleshoot graph issues
  debugGraphState() {
    console.log('=== Graph Debug Information ===');
    console.log('Cape ID:', this.capeId);
    console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
    console.log('Display dimensions:', this.canvas.width / (window.devicePixelRatio || 1), 'x', this.canvas.height / (window.devicePixelRatio || 1));
    console.log('Total data points:', this.data.length);
    console.log('Data sample:', this.data.slice(0, 3));
    console.log('Viewport:', {
      start: new Date(this.viewportStart),
      end: new Date(this.viewportEnd),
      range: (this.viewportEnd - this.viewportStart) / (1000 * 60 * 60 * 24) + ' days'
    });
    console.log('User range:', this.minUsers, '-', this.maxUsers);
    console.log('Is fetching:', this.isFetching);
    console.log('Last fetched viewport:', this.lastFetchedViewport);
    
    // Check visible data
    const visibleData = this.data.filter(d => {
      const timestamp = d.timestamp.getTime();
      return timestamp >= this.viewportStart && timestamp <= this.viewportEnd;
    });
    console.log('Visible data points:', visibleData.length);
    console.log('Visible data sample:', visibleData.slice(0, 3));
    console.log('===============================');
  }

  // Calculate the distance from a point to a line segment
  distanceToLineSegment(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) {
      param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  drawPoints(dataToPlot, displayWidth, displayHeight) {
    const ctx = this.ctx;
    
    // Draw points - only if fewer than 80 points or if hovering.
    // Skip boundary/synthetic points so we don't render dots outside the viewport
    // or fake markers on a carry-forward segment.
    const visibleDots = dataToPlot.filter(p => !p._boundary);
    if (!this.options.simplified || visibleDots.length < 80) {
      visibleDots.forEach(point => {
        const x = this.timeToX(point.timestamp, displayWidth);
        const y = this.userCountToY(point.users, displayHeight);
        
        if (this.hoverPoint && this.hoverPoint.timestamp.getTime() === point.timestamp.getTime()) {
          ctx.beginPath();
          ctx.arc(x, y, this.options.pointRadius + 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(x, y, this.options.pointRadius + 3, 0, Math.PI * 2);
          ctx.fillStyle = `${this.options.lineColor}40`;
          ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(x, y, this.options.simplified ? this.options.pointRadius - 1 : this.options.pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.options.lineColor;
        ctx.fill();
      });
    }
    
    // Draw area fill under the line
    ctx.beginPath();
    dataToPlot.forEach((point, i) => {
      const x = this.timeToX(point.timestamp, displayWidth);
      const y = this.userCountToY(point.users, displayHeight);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    const p = this.options.padding;
    ctx.lineTo(this.timeToX(dataToPlot[dataToPlot.length-1].timestamp, displayWidth), displayHeight - p);
    ctx.lineTo(this.timeToX(dataToPlot[0].timestamp, displayWidth), displayHeight - p);
    ctx.closePath();
    ctx.fillStyle = `${this.options.lineColor}20`; // 20 = 12.5% opacity
    ctx.fill();
  }
}

// Expose the class globally
window.CapeUsageGraph = CapeUsageGraph;

// Cape Data Cache to store cape data in cache
class CapeDataCache {
  constructor() {
    this.cacheData = {}; // Structure: {capeId: {timeRanges: [[start, end, timestamp], ...], data: [{timestamp, users}, ...]}}
    this.pendingRequests = {}; // To avoid duplicate requests during loading
    this.cacheDuration = 24 * 60 * 60 * 1000; // Cache validity duration: 24h in milliseconds
    this.failedRequests = {}; // Track failed requests to avoid retrying too soon
    this.failedRequestBackoff = 5 * 60 * 1000; // Wait 5 minutes before retrying failed requests
  }

  // Return cached data for a specific time range
  getDataForTimeRange(capeId, startTime, endTime) {
    if (!this.cacheData[capeId]) {
      return null;
    }
    
    // Filter data already available in the requested range
    // Convert timestamps to numbers for proper comparison
    return this.cacheData[capeId].data.filter(
      item => {
        const itemTimestamp = item.timestamp instanceof Date ? item.timestamp.getTime() : item.timestamp;
        return itemTimestamp >= startTime && itemTimestamp <= endTime;
      }
    );
  }

  // Check if the time range is completely covered by the cache
  isTimeRangeCached(capeId, startTime, endTime) {
    if (!this.cacheData[capeId] || !this.cacheData[capeId].timeRanges.length) {
      return false;
    }
    
    const now = Date.now();
    const validRanges = [];
    const invalidRanges = [];
    
    // Check if the requested range is completely covered by the cached ranges and still valid
    for (const range of this.cacheData[capeId].timeRanges) {
      // Check if the range has a timestamp (format: [start, end, timestamp])
      if (range.length >= 3) {
        if (now - range[2] < this.cacheDuration) {
          // The cache is still valid
          validRanges.push(range);
          if (range[0] <= startTime && range[1] >= endTime) {
            return true;
          }
        } else {
          // The cache has expired
          invalidRanges.push(range);
        }
      } else {
        // Old format without timestamp (format: [start, end])
        // Consider as expired by default
        invalidRanges.push(range);
      }
    }
    
    // Clean invalid ranges
    if (invalidRanges.length > 0) {
      this.cacheData[capeId].timeRanges = validRanges;
      
      // If all ranges are invalid, we should also clean the data
      if (validRanges.length === 0) {
        this.cacheData[capeId].data = [];
      }
    }
    
    return false;
  }

  // Check if a request has recently failed to avoid repeated failures
  hasRecentlyFailed(capeId, startTime, endTime) {
    if (!this.failedRequests[capeId]) {
      return false;
    }
    
    for (const failure of this.failedRequests[capeId]) {
      // Check if this request overlaps with a failed one
      const [failedStart, failedEnd, timestamp] = failure;
      const overlaps = !(failedEnd < startTime || failedStart > endTime);
      const isRecent = (Date.now() - timestamp) < this.failedRequestBackoff;
      
      if (overlaps && isRecent) {
        return true;
      }
    }
    
    // Clean up old failed requests
    this.cleanupFailedRequests(capeId);
    return false;
  }
  
  // Add a failed request to the tracking list
  addFailedRequest(capeId, startTime, endTime) {
    if (!this.failedRequests[capeId]) {
      this.failedRequests[capeId] = [];
    }
    
    this.failedRequests[capeId].push([startTime, endTime, Date.now()]);
  }
  
  // Clean up old failed requests
  cleanupFailedRequests(capeId) {
    if (!this.failedRequests[capeId]) return;
    
    const now = Date.now();
    this.failedRequests[capeId] = this.failedRequests[capeId].filter(
      failure => now - failure[2] <= this.failedRequestBackoff
    );
    
    // Remove empty arrays
    if (this.failedRequests[capeId].length === 0) {
      delete this.failedRequests[capeId];
    }
  }

  // Add data to the cache
  addData(capeId, data, startTime, endTime) {
    if (!this.cacheData[capeId]) {
      this.cacheData[capeId] = {
        timeRanges: [],
        data: []
      };
    }
    
    // Add the new time range with a timestamp
    const timestamp = Date.now();
    this.cacheData[capeId].timeRanges.push([startTime, endTime, timestamp]);
    
    // Merge the new data with existing data, without duplicates
    const existingTimestamps = new Set(this.cacheData[capeId].data.map(d => d.timestamp.getTime()));
    
    data.forEach(item => {
      if (!existingTimestamps.has(item.timestamp.getTime())) {
        this.cacheData[capeId].data.push(item);
      }
    });
    
    // Sort data by timestamp
    this.cacheData[capeId].data.sort((a, b) => a.timestamp - b.timestamp);
    
    // Merge overlapping time ranges
    this.mergeTimeRanges(capeId);
  }

  // Merge overlapping time ranges to optimize search
  mergeTimeRanges(capeId) {
    if (!this.cacheData[capeId] || this.cacheData[capeId].timeRanges.length <= 1) {
      return;
    }
    
    // Sort time ranges
    const ranges = [...this.cacheData[capeId].timeRanges].sort((a, b) => a[0] - b[0]);
    const mergedRanges = [ranges[0]];
    
    for (let i = 1; i < ranges.length; i++) {
      const current = ranges[i];
      const previous = mergedRanges[mergedRanges.length - 1];
      
      if (current[0] <= previous[1]) {
        // The ranges overlap, merge
        previous[1] = Math.max(previous[1], current[1]);
        // Keep the latest timestamp
        if (current.length >= 3 && previous.length >= 3) {
          previous[2] = Math.max(previous[2], current[2]);
        } else if (current.length >= 3) {
          previous[2] = current[2];
        }
      } else {
        // No overlap, add as new range
        mergedRanges.push(current);
      }
    }
    
    this.cacheData[capeId].timeRanges = mergedRanges;
  }

  // Check if a request is pending for the requested range
  isPendingRequest(capeId, startTime, endTime) {
    if (!this.pendingRequests[capeId]) {
      return false;
    }
    
    return this.pendingRequests[capeId].some(
      request => request.startTime <= startTime && request.endTime >= endTime
    );
  }

  // Add a pending request
  addPendingRequest(capeId, startTime, endTime, promise) {
    if (!this.pendingRequests[capeId]) {
      this.pendingRequests[capeId] = [];
    }
    
    this.pendingRequests[capeId].push({
      startTime,
      endTime,
      promise
    });
    
    return promise;
  }

  // Remove a pending request once it's finished
  removePendingRequest(capeId, promise) {
    if (!this.pendingRequests[capeId]) {
      return;
    }
    
    this.pendingRequests[capeId] = this.pendingRequests[capeId].filter(
      request => request.promise !== promise
    );
  }
}

// Create a global instance of the cache
window.capeDataCache = new CapeDataCache();
window.lastErrorMessageTimestamp = 0;
window.errorMessageDebounceTime = 1000; // minimum 1 seconde entre les messages

// Helper function to show error messages in graph containers
function showErrorMessage(message) {
  const now = Date.now();
  if (now - window.lastErrorMessageTimestamp < window.errorMessageDebounceTime) {
    console.log('Skipping duplicate error message (debounced)');
    return;
  }
  
  // Update the timestamp of the last message
  window.lastErrorMessageTimestamp = now;
  
  // Use the predefined error containers
  const simplifiedContainer = document.getElementById('simplified-graph-error-container');
  const modalContainer = document.getElementById('modal-graph-error-container');
  
  // Display the message in the containers if they exist
  if (simplifiedContainer) {
    simplifiedContainer.textContent = message;
    simplifiedContainer.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      simplifiedContainer.style.display = 'none';
    }, 5000);
  }
  
  if (modalContainer) {
    modalContainer.textContent = message;
    modalContainer.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      modalContainer.style.display = 'none';
    }, 5000);
  }
}

// Expose the function globally
window.showErrorMessage = showErrorMessage;

// Function to create the usage graph card
function createUsageGraphCard(capeId) {
  const graphCard = document.createElement('div');
  graphCard.className = 'card mb-3';
  graphCard.innerHTML = `
    <div class="d-flex flex-column">
      <div class="card-header py-1">
        <div class="d-flex justify-content-between align-items-center">
          <strong>History</strong>
          <div class="btn-group btn-group-sm clean-control" role="group">
            <button type="button" class="btn bg-body-tertiary graph-timeframe" data-timeframe="day">Day</button>
            <button type="button" class="btn bg-body-tertiary graph-timeframe active" data-timeframe="week">Week</button>
            <button type="button" class="btn bg-body-tertiary graph-timeframe" data-timeframe="month">Month</button>
            <button type="button" class="btn bg-body-tertiary graph-timeframe" data-timeframe="year">Year</button>
            <button type="button" class="btn bg-body-tertiary graph-timeframe" data-timeframe="all">Total</button>
            <button type="button" class="btn bg-body-tertiary" id="expand-graph">
              <i class="fas fa-expand"></i>
            </button>
          </div>
        </div>
        <div id="graph-stats" class="d-flex justify-content-between mt-2 text-muted" style="font-size: 12px;">
          <span>Current: <span id="stat-current">-</span></span>
          <span>Max: <span id="stat-max">-</span></span>
          <span>Min: <span id="stat-min">-</span></span>
        </div>
      </div>
      <div class="card-body py-2">
        <div id="graph-container" style="position: relative; height: 300px; width: 100%;">
          <canvas id="usage-graph" style="width: 100%; height: 100%;"></canvas>
          <div id="hover-line" style="position: absolute; display: none; width: 1px; background: rgba(0,0,0,0.3); pointer-events: none; top: 0; bottom: 0;"></div>
          <div id="hover-value" style="position: absolute; display: none; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 3px; font-size: 12px; pointer-events: none; z-index: 100;"></div>
          <div id="simplified-graph-error-container" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); padding: 8px 16px; border-radius: 4px; z-index: 1000; font-size: 14px; display: none;"></div>
          <div class="graph-loading-indicator" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: none; justify-content: center; align-items: center; z-index: 110;">
            <div class="text-center">
              <div class="spinner-border text-primary mb-2" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <div>Loading data...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create modal HTML structure
  const modalHtml = `
    <div id="graph-modal" class="modal fade">
      <div class="modal-dialog modal-xl" style="max-width: 1200px;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cape Usage Statistics</h5>
            <button type="button" class="btn" id="close-modal" aria-label="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div class="btn-group btn-group-sm clean-control" role="group">
                  <button type="button" class="btn bg-body-tertiary modal-timeframe" data-timeframe="day">Day</button>
                  <button type="button" class="btn bg-body-tertiary modal-timeframe active" data-timeframe="week">Week</button>
                  <button type="button" class="btn bg-body-tertiary modal-timeframe" data-timeframe="month">Month</button>
                  <button type="button" class="btn bg-body-tertiary modal-timeframe" data-timeframe="year">Year</button>
                  <button type="button" class="btn bg-body-tertiary modal-timeframe" data-timeframe="all">Total</button>
                </div>
                <div class="btn-group btn-group-sm clean-control btn-control" role="group">
                  <button type="button" class="btn btn-outline-secondary btn-sm" id="modal-reset-zoom">
                    <i class="fas fa-sync-alt me-1"></i>Reset Zoom
                  </button>
                  <button type="button" class="btn btn-outline-info btn-sm" id="modal-help">
                    <i class="fas fa-info-circle me-1"></i>Help
                  </button>
                </div>
              </div>
            </div>
            <div class="alert alert-info" id="modal-help-text" style="display: none;">
              <h6>Usage Tips:</h6>
              <ul class="mb-2">
                <li>Use the mouse wheel to zoom in on a specific time period</li>
                <li>Click and drag to pan the graph</li>
                <li>Hover over a point to see details</li>
                <li>Click on time period buttons to change the time range</li>
              </ul>
              <p class="mb-0">This graph shows the evolution of the number of users using this cape over time. The data is updated regularly.</p>
            </div>
            <div class="mb-3">
              <div class="card">
                <div class="card-body py-2">
                  <div class="row">
                    <div class="col-md-4">
                      <div class="d-flex flex-column align-items-center">
                        <div class="text-muted small">Current</div>
                        <div class="h4" id="modal-stat-current">-</div>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="d-flex flex-column align-items-center">
                        <div class="text-muted small">Maximum</div>
                        <div class="h4" id="modal-stat-max">-</div>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="d-flex flex-column align-items-center">
                        <div class="text-muted small">Minimum</div>
                        <div class="h4" id="modal-stat-min">-</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="modal-graph-container" style="position: relative; height: 60vh; width: 100%;">
              <canvas id="modal-usage-graph" style="width: 100%; height: 100%;"></canvas>
              <div id="modal-hover-line" style="position: absolute; display: none; width: 1px; background: rgba(0,0,0,0.3); pointer-events: none; top: 0; bottom: 0;"></div>
              <div id="modal-graph-error-container" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); padding: 8px 16px; border-radius: 4px; z-index: 1000; font-size: 14px; display: none;"></div>
              <div class="graph-loading-indicator" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: none; justify-content: center; align-items: center; z-index: 110;">
                <div class="text-center">
                  <div class="spinner-border text-primary mb-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                  <div>Loading data...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Check if modal already exists - if not, add it to the document
  if (!document.getElementById('graph-modal')) {
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  return graphCard;
}

// Initialize the graph
function initializeGraph(capeId) {
  const canvas = document.getElementById('usage-graph');
  const tooltip = document.getElementById('tooltip');
  const hoverLine = document.getElementById('hover-line');
  const hoverValue = document.getElementById('hover-value');
  
  if (!canvas) return;
  
  // Initialize main graph with simplified option and capeId
  const graph = new CapeUsageGraph(canvas, {
    tooltipContainer: tooltip,
    hoverLineElement: hoverLine,
    hoverValueElement: null, // Remove the value element that follows the curve
    simplified: true, // Simplified view for main graph
    timeframe: 'week', // Default to week data
    capeId: capeId, // Pass the capeId for data fetching
    statElements: {
      current: document.getElementById('stat-current'),
      max: document.getElementById('stat-max'),
      min: document.getElementById('stat-min')
    }
  });
  window.capeGraph = graph;
  
  // Load data
  getCapeUsageData(capeId, 'week').then(data => {
    graph.setData(data);
    
    // Initialize modal graph when data is available
    const modalCanvas = document.getElementById('modal-usage-graph');
    if (modalCanvas) {
      const modalGraph = new CapeUsageGraph(modalCanvas, {
        tooltipContainer: document.getElementById('modal-tooltip'),
        hoverLineElement: document.getElementById('modal-hover-line'),
        hoverValueElement: null, // Remove the value element that follows the curve
        simplified: false, // Full details for modal graph
        timeframe: 'week', // Match main graph's default
        capeId: capeId, // Pass the capeId for data fetching
        statElements: {
          current: document.getElementById('modal-stat-current'),
          max: document.getElementById('modal-stat-max'),
          min: document.getElementById('modal-stat-min')
        }
      });
      window.modalCapeGraph = modalGraph;
      modalGraph.setData(data);
      
      // Set up reset zoom button
      const resetZoomButton = document.getElementById('modal-reset-zoom');
      if (resetZoomButton) {
        resetZoomButton.addEventListener('click', () => {
          modalGraph.setTimeframe(document.querySelector('.modal-timeframe.active').getAttribute('data-timeframe'));
        });
      }
      
      // Set up help button
      const helpButton = document.getElementById('modal-help');
      const helpText = document.getElementById('modal-help-text');
      if (helpButton && helpText) {
        helpButton.addEventListener('click', () => {
          if (helpText.style.display === 'none') {
            helpText.style.display = 'block';
          } else {
            helpText.style.display = 'none';
          }
        });
      }
    }
  });
  
  // Set up timeframe buttons for main graph
  document.querySelectorAll('.graph-timeframe').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.graph-timeframe').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      
      const timeframe = button.getAttribute('data-timeframe');
      graph.setTimeframe(timeframe);
      
      // Sync modal timeframe if modal graph exists
      if (window.modalCapeGraph) {
        document.querySelectorAll('.modal-timeframe').forEach(b => {
          if (b.getAttribute('data-timeframe') === timeframe) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
        window.modalCapeGraph.setTimeframe(timeframe);
      }
    });
  });
  
  // Set up timeframe buttons for modal graph
  document.querySelectorAll('.modal-timeframe').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.modal-timeframe').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      
      const timeframe = button.getAttribute('data-timeframe');
      if (window.modalCapeGraph) {
        window.modalCapeGraph.setTimeframe(timeframe);
      }
      
      // Sync main graph timeframe
      document.querySelectorAll('.graph-timeframe').forEach(b => {
        if (b.getAttribute('data-timeframe') === timeframe) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      graph.setTimeframe(timeframe);
    });
  });
  
  // Set up expand button
  const expandButton = document.getElementById('expand-graph');
  if (expandButton) {
    expandButton.addEventListener('click', () => {
      openGraphModal();
    });
  }
  
  // Make the entire graph canvas clickable to open modal
  if (canvas) {
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', (e) => {
      // Check if we're clicking on a point (for interaction) or empty space (for expanding)
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // If we're not near any data point or in hover mode, open the modal
      if (!graph.hoverPoint) {
        openGraphModal();
      }
    });
  }
  
  // Function to open the graph modal
  function openGraphModal() {
    const modal = document.getElementById('graph-modal');
    if (modal) {
      modal.style.display = 'block';
      $('#graph-modal').modal('show');
    
      if (window.modalCapeGraph) {
        window.modalCapeGraph.resizeCanvas();
      }
    }
  }
  
  // Set up close modal button
  const closeButton = document.getElementById('close-modal');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      const modal = document.getElementById('graph-modal');
      if (modal) {
        $('#graph-modal').modal('hide');
        
        if (window.modalCapeGraph) {
          window.modalCapeGraph.hoverPoint = null;
          window.modalCapeGraph.draw();
        }
        
        // Hide all tooltips when modal is closed
        hideAllTooltips();
      }
    });
  }
  
  // Close modal when clicking outside
  const modal = document.getElementById('graph-modal');
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        $('#graph-modal').modal('hide');
        
        if (window.modalCapeGraph) {
          window.modalCapeGraph.hoverPoint = null;
          window.modalCapeGraph.draw();
        }
        
        // Hide all tooltips when modal is closed
        hideAllTooltips();
      }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.style.display === 'block') {
        $('#graph-modal').modal('hide');
        
        if (window.modalCapeGraph) {
          window.modalCapeGraph.hoverPoint = null;
          window.modalCapeGraph.draw();
        }
        
        // Hide all tooltips when modal is closed
        hideAllTooltips();
      }
    });
  }
  
  // Function to hide all tooltips
  function hideAllTooltips() {
    const graphs = [window.capeGraph, window.modalCapeGraph];
    graphs.forEach(graph => {
      if (graph && graph.options && graph.options.tooltipContainer) {
        graph.options.tooltipContainer.style.display = 'none';
      }
      
      // Reset hover point state
      if (graph) {
        graph.hoverPoint = null;
      }
    });
    
    // Hide hover lines
    const hoverLines = [
      document.getElementById('hover-line'),
      document.getElementById('modal-hover-line')
    ];
    
    hoverLines.forEach(line => {
      if (line) line.style.display = 'none';
    });
    
    // Force redraw
    if (window.capeGraph) window.capeGraph.draw();
    if (window.modalCapeGraph) window.modalCapeGraph.draw();
  }
}

// retrieve cape data with caching
async function getCapeUsageData(capeId, timeframe = 'week') {
  // Fetch the entire usage history in one go; the v2 columnar/RLE format is light enough
  const now = new Date();
  const startTime = 0;
  const endTime = Math.floor(now.getTime());
  
  const extendedStart = startTime;
  const extendedEnd = endTime;
  
  // Check if this request recently failed
  if (window.capeDataCache && window.capeDataCache.hasRecentlyFailed(capeId, extendedStart, extendedEnd)) {
    // Show error message
    showErrorMessage('Could not load data. Please try again later.');
    
    // Return empty array instead of mock data
    return [];
  }
  
  
  // Check if the data is already cached
  if (window.capeDataCache && window.capeDataCache.isTimeRangeCached(capeId, startTime, endTime)) {
    return window.capeDataCache.getDataForTimeRange(capeId, startTime, endTime);
  }
  
  // Check if a similar request is already in progress
  if (window.capeDataCache && window.capeDataCache.isPendingRequest(capeId, extendedStart, extendedEnd)) {
    // Wait for the request to finish then filter the data
    const pendingRequest = window.capeDataCache.pendingRequests[capeId].find(
      req => req.startTime <= extendedStart && req.endTime >= extendedEnd
    );
    
    await pendingRequest.promise;
    return window.capeDataCache.getDataForTimeRange(capeId, startTime, endTime);
  }
  
  // Prepare the API request
  
  // Create and track the loading promise
  const fetchPromise = (async () => {
    try {
      // URL of the API with parameters for the time range (v2 columnar endpoint)
      const apiUrl = `${apiBase}/v2/${capeId}/usage?start=${extendedStart}&end=${extendedEnd}`;
      
      // Display a loading indicator on the graph
      document.querySelectorAll('.graph-loading-indicator').forEach(el => {
        el.style.display = 'flex';
      });
      
      // Fetch data from the API
      const response = await fetch(apiUrl);
      
      // v2 returns 404 for a non-existent cape (legacy returned []); treat as empty
      if (response.status === 404) {
        document.querySelectorAll('.graph-loading-indicator').forEach(el => {
          el.style.display = 'none';
        });
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      checkDeprecationHeader(response);
      
      const data = await response.json();
      
      // Process and validate the data using shared function
      const validData = processApiData(data, capeId);
      
      // Hide the loading indicator
      document.querySelectorAll('.graph-loading-indicator').forEach(el => {
        el.style.display = 'none';
      });
      
      // Add to cache if available
      if (window.capeDataCache) {
        window.capeDataCache.addData(capeId, validData, extendedStart, extendedEnd);
      }
      
      return validData;
    } catch (error) {
      console.error('Error retrieving cape data:', error);
      
      // Record this as a failed request
      if (window.capeDataCache) {
        window.capeDataCache.addFailedRequest(capeId, extendedStart, extendedEnd);
      }
      
      // Hide the loading indicator
      document.querySelectorAll('.graph-loading-indicator').forEach(el => {
        el.style.display = 'none';
      });
      
      // Show error message
      showErrorMessage('Failed to load data. Please try again later.');
      
      // Return empty array instead of mock data
      return [];
    }
  })();
  
  // Register the request in cache
  if (window.capeDataCache) {
    window.capeDataCache.addPendingRequest(capeId, extendedStart, extendedEnd, fetchPromise);
  }
  
  // Wait for the request to finish
  const result = await fetchPromise;
  
  // Remove the request from the list of pending requests
  if (window.capeDataCache) {
    window.capeDataCache.removePendingRequest(capeId, fetchPromise);
  }
  
  // Filter the data for the requested time range
  return result.filter(
    item => {
      const itemTimestamp = item.timestamp instanceof Date ? item.timestamp.getTime() : item.timestamp;
      return itemTimestamp >= startTime && itemTimestamp <= endTime;
    }
  );
}

// Expose functions globally
window.createUsageGraphCard = createUsageGraphCard;
window.initializeGraph = initializeGraph;
window.getCapeUsageData = getCapeUsageData;
