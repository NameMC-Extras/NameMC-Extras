// Cape usage graph utilities

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

// Shared data processing function
function processApiData(data, capeId) {
  // Validate API response format
  if (!Array.isArray(data)) {
    throw new Error(`Invalid API response: expected array, got ${typeof data}`);
  }
  
  if (data.length === 0) {
    return [];
  }
  
  // Check first item structure
  const firstItem = data[0];
  if (!firstItem.timestamp) {
    throw new Error('Invalid API response: missing timestamp field');
  }
  
  if (!firstItem.count) {
    throw new Error('Invalid API response: missing count field');
  }
  
  // Transform data to consistent format
  const formattedData = data.map(point => ({
    timestamp: new Date(parseInt(point.timestamp)),
    users: point.count || 0
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
      lineColor: (localStorage['customTheme'] === "true" && localStorage['customBtn']) || '#236dad',
      gridColor: '#e9ecef80',
      textColor: (localStorage['customTheme'] === "true" && localStorage['customText']) || getComputedStyle(document.documentElement).getPropertyValue("--bs-body-color"),
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
    
    // For cape identification
    this.capeId = options.capeId || 'unknown';
    
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
      tooltipContainer.style.color = (localStorage['customTheme'] === "true" && localStorage['customText']) || '#DEE2E6';
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
      this.maxUsers = Math.max(...this.data.map(d => d.users));
      this.minUsers = Math.min(...this.data.map(d => d.users));
      // Add 10% padding to max
      this.maxUsers = Math.ceil(this.maxUsers * 1.1);
      
      // Set initial viewport if not set
      if (!this.viewportStart || !this.viewportEnd) {
        this.setTimeframe(this.options.timeframe);
      }
    }
    
    this.draw();
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
      default:
        this.viewportStart = Math.floor(Math.max(
          this.startTimestamp.getTime(), 
          new Date('2010-01-01').getTime() // Don't go before 2010, overkill but I hope to get older data one day
        ));
    }
    
    this.viewportEnd = Math.floor(now.getTime());
    
    // Validate viewport
    this.validateViewport();
    this.draw();
  }
  
  draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.width / dpr;
    const displayHeight = this.canvas.height / dpr;
    const p = this.options.padding;
    
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
    
    // Draw grid
    this.drawGrid(displayWidth, displayHeight);
    
    // Draw axes
    this.drawAxes(displayWidth, displayHeight);
    
    // Draw points and stats
    this.drawPoints(this.data, displayWidth, displayHeight);
    this.drawStats(this.data, displayWidth, displayHeight);
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
        ctx.fillText(formatNumber(i), p - 10, y);
      }
    }
    
    // Vertical grid lines
    const timeRange = this.viewportEnd - this.viewportStart;
    let timeStep, format;
    
    if (timeRange < 24 * 60 * 60 * 1000) {
      // Less than a day, show hourly lines
      timeStep = 60 * 60 * 1000;
      format = time => time.getHours() + ':00';
    } else if (timeRange < 7 * 24 * 60 * 60 * 1000) {
      // Less than a week, show daily lines
      timeStep = 24 * 60 * 60 * 1000;
      format = time => time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else if (timeRange < 30 * 24 * 60 * 60 * 1000) {
      // Less than a month, show weekly lines
      timeStep = 7 * 24 * 60 * 60 * 1000;
      format = time => time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else {
      // More than a month, show monthly lines
      timeStep = 30 * 24 * 60 * 60 * 1000;
      format = time => time.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
    
    const startTime = new Date(this.viewportStart);
    startTime.setHours(0, 0, 0, 0);
    
    // Calculate how many labels would fit in the available width
    const availableWidth = width - 2 * p;
    const avgLabelWidth = timeRange >= 30 * 24 * 60 * 60 * 1000 ? 80 : 60; // Month+year labels need more space
    const maxLabels = Math.floor(availableWidth / avgLabelWidth);
    
    // Count potential labels
    let labelCount = 0;
    for (let timestamp = startTime.getTime(); timestamp <= this.viewportEnd; timestamp += timeStep) {
      labelCount++;
    }
    
    // Calculate dynamic skip factor based on available space
    const dynamicSkipFactor = Math.ceil(labelCount / maxLabels);
    
    // Use the larger of our static and dynamic skip factors
    const skipFactor = Math.max(
      this.options.simplified ? 3 : 1, 
      dynamicSkipFactor
    );
    
    // For simplified mode, we'll manually draw the first and last timestamps
    let firstTime = null;
    let lastTime = null;
    
    let lineCounter = 0;
    
    for (let timestamp = startTime.getTime(); timestamp <= this.viewportEnd; timestamp += timeStep) {
      lineCounter++;
      
      // Track first and last timestamps for simplified view
      if (firstTime === null) {
        firstTime = new Date(timestamp);
      }
      lastTime = new Date(timestamp);
      
      // Always draw the first and last line, otherwise use skip factor
      const isFirstOrLast = lineCounter === 1 || timestamp + timeStep > this.viewportEnd;
      const shouldDrawLabel = isFirstOrLast || lineCounter % skipFactor === 0;
      
      if (!shouldDrawLabel && this.options.simplified) continue;
      
      const time = new Date(timestamp);
      const x = this.timeToX(time, width);
      
      // Skip the leftmost vertical line if it's too close to the Y axis
      if (x <= p + 15) continue;
      
      ctx.beginPath();
      ctx.moveTo(x, p);
      ctx.lineTo(x, height - p);
      ctx.stroke();
      
      // Label - skip for simplified view or based on dynamic skip factor except for first and last
      if ((!this.options.simplified && shouldDrawLabel) || 
          (this.options.simplified && isFirstOrLast)) {
        ctx.fillStyle = this.options.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `12px ${this.options.fontFamily}`;
        ctx.fillText(format(time), x, height - p + 5);
      }
    }
    
    // In simplified mode, always ensure first and last dates are shown
    if (this.options.simplified && firstTime && lastTime) {
      const firstX = this.timeToX(firstTime, width);
      const lastX = this.timeToX(lastTime, width);
      
      // Only draw if not already drawn and there's enough space between
      if (firstX > p + 15 && lastX - firstX > 60) {
        ctx.fillStyle = this.options.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `12px ${this.options.fontFamily}`;
        
        // First date
        ctx.fillText(format(firstTime), firstX, height - p + 5);
        
        // Last date
        ctx.fillText(format(lastTime), lastX, height - p + 5);
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
    
    const currentUsers = visibleData[visibleData.length - 1].users;
    const maxUsers = Math.max(...visibleData.map(d => d.users));
    const minUsers = Math.min(...visibleData.map(d => d.users));
    
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
        ctx.fillText(formatNumber(i), p - 5, y);
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
        this.hoverPoint = null;
        this.draw();
        return;
      }
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const displayWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 1);
    const p = this.options.padding;
    
    // Check if mouse is within the graph area
    const isWithinGraphBounds = 
      mouseX >= p && 
      mouseX <= displayWidth - p && 
      mouseY >= p && 
      mouseY <= displayHeight - p;
    
    if (!isWithinGraphBounds) {
      // Reset hover state when mouse is outside graph bounds
      this.hoverPoint = null;
      if (this.options.tooltipContainer) {
        this.options.tooltipContainer.style.display = 'none';
      }
      if (this.options.hoverLineElement) {
        this.options.hoverLineElement.style.display = 'none';
      }
      this.canvas.style.cursor = this.options.simplified ? 'pointer' : 'default';
      this.draw();
      return;
    }
    
    // Check if hovering min/max indicators in simplified view
    if (this.options.simplified && this.data.length > 0) {
      // Check if mouse is near max point
      if (this.maxPointInfo) {
        const distance = Math.sqrt(
          Math.pow(mouseX - this.maxPointInfo.x, 2) + 
          Math.pow(mouseY - this.maxPointInfo.y, 2)
        );
        
        if (distance <= 10) { // 10px hover radius
          const formattedDate = this.formatTooltipDate(this.maxPointInfo.timestamp);
          const tooltipContent = `
            <strong>Maximum:</strong> ${formatNumber(this.maxPointInfo.users)} users<br>${formattedDate}
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
            <strong>Minimum:</strong> ${formatNumber(this.minPointInfo.users)} users<br>${formattedDate}
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
    }
    
    // Find visible points and points just outside viewport
    const timeAtMouse = this.xToTime(mouseX, displayWidth);
    let lastPointBeforeViewport = null;
    let firstPointAfterViewport = null;
    const visiblePoints = [];
    
    for (let i = 0; i < this.data.length; i++) {
      const point = this.data[i];
      const timestamp = point.timestamp.getTime();
      
      if (timestamp < this.viewportStart) {
        lastPointBeforeViewport = point;
      } else if (timestamp > this.viewportEnd) {
        firstPointAfterViewport = point;
        break;
      } else {
        visiblePoints.push(point);
      }
    }
    
    // Find closest point including those just outside viewport and interpolated points
    let closestPoint = null;
    let closestDistance = Infinity;
    let closestX = 0;
    let closestY = 0;
    let isInterpolated = false;
    
    const checkLineSegment = (p1, p2) => {
      if (!p1 || !p2) return;
      
      const x1 = this.timeToX(p1.timestamp, displayWidth);
      const y1 = this.userCountToY(p1.users, displayHeight);
      const x2 = this.timeToX(p2.timestamp, displayWidth);
      const y2 = this.userCountToY(p2.users, displayHeight);
      
      // Calculate distance from mouse to line segment
      const distance = this.distanceToLineSegment(mouseX, mouseY, x1, y1, x2, y2);
      
      if (distance < closestDistance && distance <= this.options.hoverRadius) {
        closestDistance = distance;
        
        // Calculate the interpolated point on the line
        const dx = x2 - x1;
        const dy = y2 - y1;
        const t = ((mouseX - x1) * dx + (mouseY - y1) * dy) / (dx * dx + dy * dy);
        const interpolatedX = x1 + t * dx;
        const interpolatedY = y1 + t * dy;
        
        // Calculate interpolated timestamp and users
        const t2 = (mouseX - x1) / (x2 - x1);
        const timestamp = new Date(p1.timestamp.getTime() + t2 * (p2.timestamp.getTime() - p1.timestamp.getTime()));
        const users = Math.round(p1.users + t2 * (p2.users - p1.users));
        
        closestPoint = { timestamp, users };
        closestX = interpolatedX;
        closestY = interpolatedY;
        isInterpolated = true;
      }
    };
    
    // Check actual data points first
    const checkPoint = (point) => {
      if (!point) return;
      const x = this.timeToX(point.timestamp, displayWidth);
      const y = this.userCountToY(point.users, displayHeight);
      const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
      
      if (distance < closestDistance && distance <= this.options.hoverRadius) {
        closestDistance = distance;
        closestPoint = point;
        closestX = x;
        closestY = y;
        isInterpolated = false;
      }
    };
    
    // Check all data points first
    if (lastPointBeforeViewport) checkPoint(lastPointBeforeViewport);
    visiblePoints.forEach(checkPoint);
    if (firstPointAfterViewport) checkPoint(firstPointAfterViewport);
    
    // Then check line segments if no point was close enough
    if (!closestPoint || closestDistance > this.options.hoverRadius / 2) {
      // Check line segments between points
      if (lastPointBeforeViewport && visiblePoints[0]) {
        checkLineSegment(lastPointBeforeViewport, visiblePoints[0]);
      }
      
      for (let i = 0; i < visiblePoints.length - 1; i++) {
        checkLineSegment(visiblePoints[i], visiblePoints[i + 1]);
      }
      
      if (visiblePoints.length > 0 && firstPointAfterViewport) {
        checkLineSegment(visiblePoints[visiblePoints.length - 1], firstPointAfterViewport);
      }
      
      // Special case: if no visible points but we have points on both sides
      if (visiblePoints.length === 0 && lastPointBeforeViewport && firstPointAfterViewport) {
        checkLineSegment(lastPointBeforeViewport, firstPointAfterViewport);
      }
    }
    
    // Reset hover state if not close to any point or line
    if (!closestPoint || closestDistance > this.options.hoverRadius) {
      this.hoverPoint = null;
      if (this.options.tooltipContainer) {
        this.options.tooltipContainer.style.display = 'none';
      }
      if (this.options.hoverLineElement) {
        this.options.hoverLineElement.style.display = 'none';
      }
      this.canvas.style.cursor = this.options.simplified ? 'pointer' : 'default';
      this.draw();
      return;
    }
    
    // Update hover state
    this.hoverPoint = closestPoint;
    this.canvas.style.cursor = 'pointer';
    
    // Show tooltip
    if (this.options.tooltipContainer) {
      const formattedDate = this.options.simplified ? 
        this.formatTooltipDate(closestPoint.timestamp) : 
        this.formatDetailedTooltipDate(closestPoint.timestamp);
      
      const tooltipContent = `
        <strong>${formattedDate}</strong><br>
        ${formatNumber(closestPoint.users)} users
      `;
      
      this.positionTooltip(
        this.options.tooltipContainer,
        closestX,
        closestY,
        tooltipContent
      );
    }
    
    // Show hover line in detailed view
    if (!this.options.simplified && this.options.hoverLineElement) {
      const hoverLine = this.options.hoverLineElement;
      hoverLine.style.display = 'block';
      hoverLine.style.left = `${closestX}px`;
      hoverLine.style.top = `${p}px`;
      hoverLine.style.height = `${displayHeight - 2 * p}px`;
    }
    
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
  
  // Helper method to simplify data points while preserving important features and shape
  simplifyData(data, targetPoints) {
    if (data.length <= targetPoints) return data;
    if (data.length <= 2) return data;
    
    // Calculate importance of each point
    const importance = new Array(data.length).fill(0);
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const next = data[i + 1];
      
      // Calculate vertical distance from point to line formed by neighbors
      const dx = next.timestamp.getTime() - prev.timestamp.getTime();
      const dy = next.users - prev.users;
      const slope = dy / dx;
      
      const expectedY = prev.users + slope * (curr.timestamp.getTime() - prev.timestamp.getTime());
      importance[i] = Math.abs(curr.users - expectedY);
    }
    
    // Always keep first and last points
    importance[0] = importance[data.length - 1] = Infinity;
    
    // Select points based on importance
    const result = [];
    const used = new Set();
    
    // Helper to find next most important point in a range
    const findNextPoint = (start, end) => {
      let maxImportance = -1;
      let maxIndex = -1;
      for (let i = start; i <= end; i++) {
        if (!used.has(i) && importance[i] > maxImportance) {
          maxImportance = importance[i];
          maxIndex = i;
        }
      }
      return maxIndex;
    };
    
    // Add first and last points
    result.push(data[0]);
    used.add(0);
    result.push(data[data.length - 1]);
    used.add(data.length - 1);
    
    // Add remaining points based on importance
    while (result.length < targetPoints) {
      // Find longest segment
      let maxGap = 0;
      let gapStart = 0;
      
      for (let i = 0; i < result.length - 1; i++) {
        const curr = result[i];
        const next = result[i + 1];
        const gap = next.timestamp.getTime() - curr.timestamp.getTime();
        if (gap > maxGap) {
          maxGap = gap;
          gapStart = curr;
        }
      }
      
      // Find start and end indices in original data
      const startIdx = data.findIndex(p => p.timestamp.getTime() === gapStart.timestamp.getTime());
      const endIdx = data.findIndex(p => p.timestamp.getTime() === result[result.findIndex(r => r.timestamp.getTime() === gapStart.timestamp.getTime()) + 1].timestamp.getTime());
      
      // Find most important point in this gap
      const nextIdx = findNextPoint(startIdx, endIdx);
      if (nextIdx === -1) break;
      
      result.push(data[nextIdx]);
      used.add(nextIdx);
    }
    
    // Sort by timestamp
    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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
    
    // Set the range to fetch
    const fetchStart = Math.floor(Math.max(
      new Date('2010-01-01').getTime(), 
      this.viewportStart - padding
    ));
    const fetchEnd = Math.floor(Math.min(
      new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
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
          this.draw(); // Redraw after adding new data
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
    
    // Set fetching flag
    this.isFetching = true;
    
    // If we need to fetch, show loading indicator
    const graphLoadingIndicators = document.querySelectorAll('.graph-loading-indicator');
    graphLoadingIndicators.forEach(indicator => {
      indicator.style.display = 'flex';
    });
    
    try {
      // Fetch data from API
      const apiUrl = `https://cors.faav.top/fyz/${this.capeId}/usage?start=${fetchStart}&end=${fetchEnd}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process and validate the data using shared function
      const validData = processApiData(data, this.capeId);
      
      // Hide the loading indicator
      document.querySelectorAll('.graph-loading-indicator').forEach(el => {
        el.style.display = 'none';
      });
      
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
          this.draw(); // Redraw after adding new data
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
      // Reset fetching flag
      this.isFetching = false;
      
      // Hide loading indicator
      graphLoadingIndicators.forEach(indicator => {
        indicator.style.display = 'none';
      });
      
      // Redraw graph with whatever data we have
      this.draw();
      
      // If a fetch was requested while we were fetching, do it now
      if (this.pendingFetch) {
        setTimeout(() => this.fetchDataForViewport(), 0);
      }
    }
  }
  
  validateViewport() {
    const now = Math.floor(new Date().getTime());
    const minAllowedTime = Math.floor(new Date('2010-01-01').getTime());
    const maxAllowedTime = Math.floor(now + 7 * 24 * 60 * 60 * 1000); // Only 1 week into future
    
    // Limit start time
    this.viewportStart = Math.floor(Math.max(
      this.viewportStart,
      minAllowedTime,
      this.data.length > 0 ? this.data[0].timestamp.getTime() : minAllowedTime
    ));
    
    // Limit end time
    this.viewportEnd = Math.floor(Math.min(
      this.viewportEnd,
      maxAllowedTime,
      this.data.length > 0 ? this.data[this.data.length - 1].timestamp.getTime() : maxAllowedTime
    ));
    
    // Ensure the viewport isn't too large (max 20 years)
    const maxTimeRange = Math.floor(20 * 365 * 24 * 60 * 60 * 1000);
    if (this.viewportEnd - this.viewportStart > maxTimeRange) {
      this.viewportStart = Math.floor(this.viewportEnd - maxTimeRange);
    }
    
    // Ensure the viewport isn't too small (min 30 minutes)
    const minTimeRange = Math.floor(30 * 60 * 1000);
    if (this.viewportEnd - this.viewportStart < minTimeRange) {
      this.viewportEnd = Math.floor(this.viewportStart + minTimeRange);
    }
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
    const p = this.options.padding;
    
    // Set up clipping region for the graph area first
    ctx.save();
    ctx.beginPath();
    ctx.rect(p, p, displayWidth - 2 * p, displayHeight - 2 * p);
    ctx.clip();

    // Draw the line connecting all points
    ctx.beginPath();
    ctx.strokeStyle = this.options.lineColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Find points that are visible or needed for interpolation
    let lastPointBeforeViewport = null;
    let firstPointAfterViewport = null;
    const visiblePoints = [];
    
    for (let i = 0; i < dataToPlot.length; i++) {
      const point = dataToPlot[i];
      const timestamp = point.timestamp.getTime();
      
      if (timestamp < this.viewportStart) {
        lastPointBeforeViewport = point;
      } else if (timestamp > this.viewportEnd) {
        firstPointAfterViewport = point;
        break;
      } else {
        visiblePoints.push(point);
      }
    }
    
    // Always draw the line if we have points on either side of the viewport
    if (lastPointBeforeViewport) {
      const x = this.timeToX(lastPointBeforeViewport.timestamp, displayWidth);
      const y = this.userCountToY(lastPointBeforeViewport.users, displayHeight);
      ctx.moveTo(x, y);
    }
    
    // Draw all visible points
    visiblePoints.forEach((point, i) => {
      const x = this.timeToX(point.timestamp, displayWidth);
      const y = this.userCountToY(point.users, displayHeight);
      
      if (i === 0 && !lastPointBeforeViewport) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Always connect to the first point after viewport if it exists
    if (firstPointAfterViewport) {
      const x = this.timeToX(firstPointAfterViewport.timestamp, displayWidth);
      const y = this.userCountToY(firstPointAfterViewport.users, displayHeight);
      ctx.lineTo(x, y);
    }
    
    // If we have no visible points but points on both sides, draw the interpolation line
    if (visiblePoints.length === 0 && lastPointBeforeViewport && firstPointAfterViewport) {
      const x1 = this.timeToX(lastPointBeforeViewport.timestamp, displayWidth);
      const y1 = this.userCountToY(lastPointBeforeViewport.users, displayHeight);
      const x2 = this.timeToX(firstPointAfterViewport.timestamp, displayWidth);
      const y2 = this.userCountToY(firstPointAfterViewport.users, displayHeight);
      
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    
    // Stroke the line
    ctx.stroke();
    
    // Draw area fill under the line
    if ((visiblePoints.length > 0 || (lastPointBeforeViewport && firstPointAfterViewport))) {
      const lastX = firstPointAfterViewport ? 
        this.timeToX(firstPointAfterViewport.timestamp, displayWidth) : 
        this.timeToX(visiblePoints[visiblePoints.length-1].timestamp, displayWidth);
      
      const firstX = lastPointBeforeViewport ? 
        this.timeToX(lastPointBeforeViewport.timestamp, displayWidth) : 
        this.timeToX(visiblePoints[0].timestamp, displayWidth);
      
      ctx.lineTo(lastX, displayHeight - p);
      ctx.lineTo(firstX, displayHeight - p);
      ctx.closePath();
      ctx.fillStyle = `${this.options.lineColor}20`; // 20 = 12.5% opacity
      ctx.fill();
    }
    
    // In simplified view, only show points if there are fewer than 80
    if (!this.options.simplified || visiblePoints.length < 80) {
      // Draw the points, including the ones just outside viewport for continuity
      const drawPointIfVisible = (point) => {
        if (!point) return;
        const x = this.timeToX(point.timestamp, displayWidth);
        const y = this.userCountToY(point.users, displayHeight);
        
        // Only draw if the point would be visible within the clipping region
        if (x >= p && x <= displayWidth - p && y >= p && y <= displayHeight - p) {
          this.drawPoint(ctx, x, y, point);
        }
      };
      
      if (lastPointBeforeViewport) drawPointIfVisible(lastPointBeforeViewport);
      visiblePoints.forEach(point => drawPointIfVisible(point));
      if (firstPointAfterViewport) drawPointIfVisible(firstPointAfterViewport);
    }
    
    // Restore the canvas state (removes clipping)
    ctx.restore();
  }

  // Helper method to draw a single point
  drawPoint(ctx, x, y, point) {
    // Highlight point if it's being hovered
    if (this.hoverPoint && this.hoverPoint.timestamp.getTime() === point.timestamp.getTime()) {
      // Draw highlight circle in 2 steps for better visibility
      // First a larger background circle
      ctx.beginPath();
      ctx.arc(x, y, this.options.pointRadius + 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; // White background circle
      ctx.fill();
      
      // Then a medium highlight circle
      ctx.beginPath();
      ctx.arc(x, y, this.options.pointRadius + 3, 0, Math.PI * 2);
      ctx.fillStyle = `${this.options.lineColor}40`; // 40 = 25% opacity
      ctx.fill();
    }
    
    // Draw the actual point
    ctx.beginPath();
    ctx.arc(x, y, this.options.simplified ? this.options.pointRadius - 1 : this.options.pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.options.lineColor;
    ctx.fill();
  }
}

// Expose the class globally
window.CapeUsageGraph = CapeUsageGraph;

// Cape Data Cache to store cape data in localStorage
class CapeDataCache {
  constructor() {
    this.CACHE_PREFIX = 'cape_data_';
    this.CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  // Get cached data for a cape
  getCachedData(capeId) {
    try {
      const cacheKey = this.CACHE_PREFIX + capeId;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      const { data, timestamp } = JSON.parse(cachedData);
      
      // Check if cache has expired
      if (Date.now() - timestamp > this.CACHE_EXPIRATION) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      // Convert timestamps back to Date objects
      return data.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  // Store data in cache
  setCachedData(capeId, data) {
    try {
      const cacheKey = this.CACHE_PREFIX + capeId;
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }

  // Clear expired cache entries
  clearExpiredCache() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.CACHE_PREFIX)) {
          const cachedData = JSON.parse(localStorage.getItem(key));
          if (Date.now() - cachedData.timestamp > this.CACHE_EXPIRATION) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }
}

// Create a global instance of the cache
window.capeDataCache = new CapeDataCache();
window.lastErrorMessageTimestamp = 0;
window.errorMessageDebounceTime = 1000; // minimum 1 second between messages

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
            <button type="button" class="btn bg-body-tertiary graph-timeframe" data-timeframe="all">All time</button>
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
                  <button type="button" class="btn bg-body-tertiary modal-timeframe" data-timeframe="all">All time</button>
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
              </br>
              <p class="mb-0">As you may notice, some of the older data points on the graph are still inaccurate or incomplete. If you have access to the correct values or know where to find them, please contact fyz (fy5) on Discord.</p>
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
  // Check if data is in cache
  const cachedData = window.capeDataCache.getCachedData(capeId);
  if (cachedData) {
    // Convert timestamps back to Date objects if needed
    const data = cachedData.map(item => ({
      ...item,
      timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
    }));
    return data;
  }

  try {
    // Show loading indicator
    document.querySelectorAll('.graph-loading-indicator').forEach(el => {
      el.style.display = 'flex';
    });

    // Fetch all historical data
    const apiUrl = `https://cors.faav.top/fyz/${capeId}/usage?start=${Math.floor(new Date('2010-01-01').getTime())}&end=${Math.floor(new Date().getTime())}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Process and validate the data
    const validData = processApiData(data, capeId);

    // Cache the full dataset
    window.capeDataCache.setCachedData(capeId, validData);

    // Hide loading indicator
    document.querySelectorAll('.graph-loading-indicator').forEach(el => {
      el.style.display = 'none';
    });

    return validData;

  } catch (error) {
    console.error('Error retrieving cape data:', error);
    
    // Hide loading indicator
    document.querySelectorAll('.graph-loading-indicator').forEach(el => {
      el.style.display = 'none';
    });

    // Show error message
    showErrorMessage('Failed to load data. Please try again later.');
    
    return [];
  }
}

// Expose functions globally
window.createUsageGraphCard = createUsageGraphCard;
window.initializeGraph = initializeGraph;
window.getCapeUsageData = getCapeUsageData;
