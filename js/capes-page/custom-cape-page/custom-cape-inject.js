console.log("Creating custom cape page...");

// only use for getting animate cookie
function getCookie(name) {
  let cookies = Object.fromEntries(document.cookie.split(';').map(e => e.split('=').map(e => decodeURIComponent(e.trim()))));
  return cookies[name];
}

// Cape usage graph utility class, directly defined in this file
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
        min: document.getElementById('stat-min'),
        avg: document.getElementById('stat-avg')
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
    this.fetchPadding = 0.3; // Fetch 30% more data on each side
    
    // Make canvas responsive
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Add event listeners if not simplified
    if (!this.options.simplified) {
      this.addEventListeners();
    }
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
    this.data = data.sort((a, b) => a.timestamp - b.timestamp);
    
    if (this.data.length > 0) {
      this.startTimestamp = this.data[0].timestamp;
      this.endTimestamp = this.data[this.data.length - 1].timestamp;
      this.maxUsers = Math.max(...this.data.map(d => d.users));
      this.minUsers = Math.min(...this.data.map(d => d.users));
      // Add 10% padding to max
      this.maxUsers = Math.ceil(this.maxUsers * 1.1);
    }
    
    this.setTimeframe(this.options.timeframe);
    this.draw();
  }
  
  setTimeframe(timeframe) {
    this.options.timeframe = timeframe;
    
    if (!this.data.length) {
      // Set reasonable default viewport when there's no data
      const now = new Date();
      this.viewportStart = new Date(now - 30 * 24 * 60 * 60 * 1000).getTime(); // 30 days ago
      this.viewportEnd = now.getTime();
      this.draw();
      return;
    }
    
    const now = new Date();
    switch (timeframe) {
      case 'day':
        this.viewportStart = new Date(now - 24 * 60 * 60 * 1000).getTime();
        break;
      case 'week':
        this.viewportStart = new Date(now - 7 * 24 * 60 * 60 * 1000).getTime();
        break;
      case 'month':
        this.viewportStart = new Date(now - 30 * 24 * 60 * 60 * 1000).getTime();
        break;
      case 'year':
        this.viewportStart = new Date(now - 365 * 24 * 60 * 60 * 1000).getTime();
        break;
      case 'all':
      default:
        this.viewportStart = Math.max(
          this.startTimestamp.getTime(), 
          new Date('2010-01-01').getTime() // More restrictive: don't go before 2010
        );
    }
    
    this.viewportEnd = now.getTime();
    
    // Reset lastFetchedViewport when timeframe changes
    this.lastFetchedViewport = { start: 0, end: 0 };
    
    this.validateViewport(); // Apply additional constraints
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
    
    // Filter data points in current viewport
    const visibleData = this.data.filter(d => {
      const timestamp = d.timestamp.getTime();
      return timestamp >= this.viewportStart && timestamp <= this.viewportEnd;
    });
    
    // If no visible data in the current timeframe, still draw empty grid and axes
    if (visibleData.length === 0) {
      this.drawGrid(displayWidth, displayHeight);
      this.drawAxes(displayWidth, displayHeight);
      
      // Try to fetch data for this viewport
      this.fetchDataForViewport();
      return;
    }
    
    // Draw grid
    this.drawGrid(displayWidth, displayHeight);
    
    // Draw axes
    this.drawAxes(displayWidth, displayHeight);
    
    // Draw data
    ctx.beginPath();
    ctx.strokeStyle = this.options.lineColor;
    ctx.lineWidth = 2;
    
    // For simplified view, use more data points for smoother curve
    const dataToPlot = this.options.simplified && visibleData.length > 200 
      ? this.simplifyData(visibleData, 100)  // Use 100 points instead of 50
      : visibleData;
    
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
    
    // Area fill under the line
    ctx.lineTo(this.timeToX(dataToPlot[dataToPlot.length-1].timestamp, displayWidth), displayHeight - p);
    ctx.lineTo(this.timeToX(dataToPlot[0].timestamp, displayWidth), displayHeight - p);
    ctx.closePath();
    ctx.fillStyle = `${this.options.lineColor}20`; // 20 = 12.5% opacity
    ctx.fill();
    
    // Draw points - only if fewer than 80 points or if hovering
    if (!this.options.simplified || dataToPlot.length < 80) {
      dataToPlot.forEach(point => {
        const x = this.timeToX(point.timestamp, displayWidth);
        const y = this.userCountToY(point.users, displayHeight);
        
        // Highlight point if it's being hovered
        if (this.hoverPoint && this.hoverPoint.timestamp.getTime() === point.timestamp.getTime()) {
          // Draw highlight circle
          ctx.beginPath();
          ctx.arc(x, y, this.options.pointRadius + 3, 0, Math.PI * 2);
          ctx.fillStyle = `${this.options.lineColor}40`; // 40 = 25% opacity
          ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(x, y, this.options.simplified ? this.options.pointRadius - 1 : this.options.pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.options.lineColor;
        ctx.fill();
      });
    }
    
    // Draw legend/stats
    this.drawStats(visibleData, displayWidth, displayHeight);
    
    // Check if we need to fetch more data in the background
    // We do this after drawing to ensure good user experience
    setTimeout(() => this.fetchDataForViewport(), 10);
  }
  
  drawNoData(message = "No data available") {
    // Do nothing - we'll draw empty grid instead
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
        ctx.fillText(i.toString(), p - 10, y);
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
    const avgUsers = visibleData.reduce((sum, d) => sum + d.users, 0) / visibleData.length;
    
    // Update stats in the HTML
    const { statElements } = this.options;
    if (statElements) {
      if (statElements.current) statElements.current.textContent = currentUsers;
      if (statElements.max) statElements.max.textContent = maxUsers;
      if (statElements.min) statElements.min.textContent = minUsers;
      if (statElements.avg) statElements.avg.textContent = Math.round(avgUsers);
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
        ctx.fillText(i.toString(), p - 5, y);
      }
      
      // Show more timestamps on simplified graph
      const timeRange = this.viewportEnd - this.viewportStart;
      let timeStep, format;
      
      if (timeRange < 24 * 60 * 60 * 1000) {
        // Less than a day, show hourly lines
        timeStep = 2 * 60 * 60 * 1000; // Every 2 hours
        format = time => time.getHours() + ':00';
      } else if (timeRange < 7 * 24 * 60 * 60 * 1000) {
        // Less than a week, show daily lines
        timeStep = 24 * 60 * 60 * 1000;
        format = time => time.toLocaleDateString(undefined, { weekday: 'short' });
      } else if (timeRange < 30 * 24 * 60 * 60 * 1000) {
        // Less than a month, show every 2 days
        timeStep = 2 * 24 * 60 * 60 * 1000;
        format = time => time.toLocaleDateString(undefined, { day: 'numeric' });
      } else {
        // More than a month, show weekly
        timeStep = 7 * 24 * 60 * 60 * 1000;
        format = time => time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
      
      const startTime = new Date(this.viewportStart);
      startTime.setHours(0, 0, 0, 0);
      
      // Calculate available space for labels
      const availableWidth = width - 2 * p;
      const labelWidth = 40; // Estimated width of each label
      const maxLabels = Math.floor(availableWidth / labelWidth);
      
      // Count how many potential labels we would have
      let labelCount = 0;
      for (let timestamp = startTime.getTime(); timestamp <= this.viewportEnd; timestamp += timeStep) {
        labelCount++;
      }
      
      // Calculate dynamic skip factor
      const skipFactor = Math.max(1, Math.ceil(labelCount / maxLabels));
      
      // Draw time labels with dynamic spacing
      let labelCounter = 0;
      for (let timestamp = startTime.getTime(); timestamp <= this.viewportEnd; timestamp += timeStep) {
        labelCounter++;
        if (labelCounter % skipFactor !== 0 && timestamp !== startTime.getTime() && timestamp + timeStep <= this.viewportEnd) continue;
        
        const time = new Date(timestamp);
        const x = this.timeToX(time, width);
        
        // Skip if too close to y-axis
        if (x <= p + 15) continue;
        
        // Draw vertical grid line
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(x, p);
        ctx.lineTo(x, height - p);
        ctx.strokeStyle = this.options.gridColor;
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw label
        ctx.fillStyle = this.options.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `11px ${this.options.fontFamily}`;
        ctx.fillText(format(time), x, height - p + 5);
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
      
      // Zoom factor - more gradual (0.9 and 1.1 instead of 0.8 and 1.2)
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
      this.isDragging = false;
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
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const displayWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Check if hovering min/max indicators in simplified view
    if (this.options.simplified && this.data.length > 0) {
      // Create tooltip div if it doesn't exist
      if (!this.tooltipElement) {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.style.position = 'absolute';
        this.tooltipElement.style.backgroundColor = 'rgba(0,0,0,0.8)';
        this.tooltipElement.style.color = 'white';
        this.tooltipElement.style.padding = '5px 10px';
        this.tooltipElement.style.borderRadius = '4px';
        this.tooltipElement.style.fontSize = '12px';
        this.tooltipElement.style.pointerEvents = 'none';
        this.tooltipElement.style.zIndex = '1000';
        this.tooltipElement.style.display = 'none';
        document.body.appendChild(this.tooltipElement);
      }
      
      // Check if mouse is near max point
      if (this.maxPointInfo) {
        const distance = Math.sqrt(
          Math.pow(mouseX - this.maxPointInfo.x, 2) + 
          Math.pow(mouseY - this.maxPointInfo.y, 2)
        );
        
        if (distance <= 10) { // 10px hover radius
          // Show tooltip
          this.tooltipElement.style.display = 'block';
          this.tooltipElement.style.left = (e.clientX + 10) + 'px';
          this.tooltipElement.style.top = (e.clientY - 25) + 'px';
          
          const formattedDate = this.formatTooltipDate(this.maxPointInfo.timestamp);
          this.tooltipElement.innerHTML = `<strong>Maximum:</strong> ${this.maxPointInfo.users} users<br>${formattedDate}`;
          
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
          // Show tooltip
          this.tooltipElement.style.display = 'block';
          this.tooltipElement.style.left = (e.clientX + 10) + 'px';
          this.tooltipElement.style.top = (e.clientY - 25) + 'px';
          
          const formattedDate = this.formatTooltipDate(this.minPointInfo.timestamp);
          this.tooltipElement.innerHTML = `<strong>Minimum:</strong> ${this.minPointInfo.users} users<br>${formattedDate}`;
          
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
      
      // Hide tooltip if not hovering any special point
      if (this.tooltipElement) {
        this.tooltipElement.style.display = 'none';
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
    
    // Find closest point
    let closestPoint = null;
    let closestDistance = Infinity;
    let closestX = 0;
    let closestY = 0;
    
    for (const point of visibleData) {
      const pointX = this.timeToX(point.timestamp, displayWidth);
      const pointY = this.userCountToY(point.users, displayHeight);
      
      const distance = Math.sqrt(Math.pow(mouseX - pointX, 2) + Math.pow(mouseY - pointY, 2));
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
        closestX = pointX;
        closestY = pointY;
      }
    }
    
    // Advanced tooltip for detailed/modal graph
    if (!this.options.simplified && visibleData.length > 0) {
      // Create tooltip element if it doesn't exist
      if (!this.hoverTooltipElement) {
        this.hoverTooltipElement = document.createElement('div');
        this.hoverTooltipElement.style.position = 'absolute';
        this.hoverTooltipElement.style.backgroundColor = 'rgba(0,0,0,0.8)';
        this.hoverTooltipElement.style.color = 'white';
        this.hoverTooltipElement.style.padding = '5px 10px';
        this.hoverTooltipElement.style.borderRadius = '4px';
        this.hoverTooltipElement.style.fontSize = '12px';
        this.hoverTooltipElement.style.pointerEvents = 'none';
        this.hoverTooltipElement.style.zIndex = '9999'; // Augmenter le z-index pour être sûr qu'il est au-dessus de tout
        this.hoverTooltipElement.style.display = 'none';
        this.hoverTooltipElement.style.transition = 'transform 0.1s ease-out';
        this.hoverTooltipElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        document.body.appendChild(this.hoverTooltipElement);
      }
      
      // Now check if we're near the line by checking distance to line segments
      let isNearLine = false;
      let nearestLinePoint = null;
      let nearestLineDistance = Infinity;
      let interpolatedUsers = null;
      
      // Sort data by timestamp
      const sortedData = [...visibleData].sort((a, b) => a.timestamp - b.timestamp);
      
      // Check each line segment
      for (let i = 0; i < sortedData.length - 1; i++) {
        const p1 = sortedData[i];
        const p2 = sortedData[i + 1];
        
        const x1 = this.timeToX(p1.timestamp, displayWidth);
        const y1 = this.userCountToY(p1.users, displayHeight);
        const x2 = this.timeToX(p2.timestamp, displayWidth);
        const y2 = this.userCountToY(p2.users, displayHeight);
        
        // Calculate distance from mouse to line segment
        const distance = this.distanceToLineSegment(mouseX, mouseY, x1, y1, x2, y2);
        
        if (distance < 15 && distance < nearestLineDistance) { // 15px threshold
          nearestLineDistance = distance;
          isNearLine = true;
          
          // Interpolate value at mouse position
          const mouseTime = this.xToTime(mouseX, displayWidth);
          const leftTime = p1.timestamp.getTime();
          const rightTime = p2.timestamp.getTime();
          
          // Make sure mouse is between these two points in time
          if (mouseTime >= leftTime && mouseTime <= rightTime) {
            const timeDiff = rightTime - leftTime;
            const position = timeDiff === 0 ? 0 : (mouseTime - leftTime) / timeDiff;
            interpolatedUsers = Math.round(p1.users + position * (p2.users - p1.users));
            nearestLinePoint = new Date(mouseTime);
          }
        }
      }
      
      // If we're near a point, use that point's value
      if (closestDistance < 15) {
        this.hoverPoint = closestPoint;
        this.canvas.style.cursor = 'pointer';
        
        // Show tooltip with precise value
        const formattedDate = this.formatDetailedTooltipDate(closestPoint.timestamp);
        this.hoverTooltipElement.style.display = 'block';
        this.hoverTooltipElement.style.left = (e.clientX + 15) + 'px';
        this.hoverTooltipElement.style.top = (e.clientY - 15) + 'px';
        this.hoverTooltipElement.innerHTML = `
          <div style="font-weight: bold;">${formattedDate}</div>
          <div>${closestPoint.users} users</div>
        `;
        
        // Also show hover line 
        if (this.options.hoverLineElement) {
          const hoverLine = this.options.hoverLineElement;
          hoverLine.style.display = 'block';
          hoverLine.style.left = `${closestX}px`;
          hoverLine.style.zIndex = '998'; // Ajouter un z-index élevé
          
          // Supprimer l'affichage de l'élément de valeur qui suit la courbe
          if (this.options.hoverValueElement) {
            this.options.hoverValueElement.style.display = 'none';
          }
        }
      } 
      // If we're near the line but not a specific point, show interpolated value
      else if (isNearLine && nearestLinePoint && interpolatedUsers !== null) {
        this.canvas.style.cursor = 'pointer';
        
        // Show tooltip with interpolated value
        const formattedDate = this.formatDetailedTooltipDate(nearestLinePoint);
        this.hoverTooltipElement.style.display = 'block';
        this.hoverTooltipElement.style.left = (e.clientX + 15) + 'px';
        this.hoverTooltipElement.style.top = (e.clientY - 15) + 'px';
        this.hoverTooltipElement.innerHTML = `
          <div style="font-weight: bold;">${formattedDate}</div>
          <div>${interpolatedUsers} users</div>
        `;
        
        // Show hover line
        if (this.options.hoverLineElement) {
          const hoverLine = this.options.hoverLineElement;
          hoverLine.style.display = 'block';
          hoverLine.style.left = `${mouseX}px`;
          hoverLine.style.zIndex = '998'; // Ajouter un z-index élevé
          
          // Supprimer l'affichage de l'élément de valeur qui suit la courbe
          if (this.options.hoverValueElement) {
            this.options.hoverValueElement.style.display = 'none';
          }
        }
        
        this.hoverPoint = null;
      } else {
        // Try generic interpolation between points as fallback
        const mouseTime = this.xToTime(mouseX, displayWidth);
        
        // Find points before and after mouse position
        let leftPoint = null;
        let rightPoint = null;
        
        for (let i = 0; i < sortedData.length - 1; i++) {
          if (sortedData[i].timestamp <= mouseTime && sortedData[i + 1].timestamp >= mouseTime) {
            leftPoint = sortedData[i];
            rightPoint = sortedData[i + 1];
            break;
          }
        }
        
        // If we found surrounding points, interpolate
        if (leftPoint && rightPoint) {
          const leftTime = leftPoint.timestamp.getTime();
          const rightTime = rightPoint.timestamp.getTime();
          const timeDiff = rightTime - leftTime;
          
          // Calculate position between points (0 to 1)
          const position = timeDiff === 0 ? 0 : (mouseTime - leftTime) / timeDiff;
          
          // Interpolate value
          const interpolatedUsers = Math.round(
            leftPoint.users + position * (rightPoint.users - leftPoint.users)
          );
          
          // Show tooltip with interpolated value
          const formattedDate = this.formatDetailedTooltipDate(new Date(mouseTime));
          this.hoverTooltipElement.style.display = 'block';
          this.hoverTooltipElement.style.left = (e.clientX + 15) + 'px';
          this.hoverTooltipElement.style.top = (e.clientY - 15) + 'px';
          this.hoverTooltipElement.innerHTML = `
            <div style="font-weight: bold;">${formattedDate}</div>
            <div>${interpolatedUsers} users</div>
          `;
          
          // Show hover line
          if (this.options.hoverLineElement) {
            const hoverLine = this.options.hoverLineElement;
            hoverLine.style.display = 'block';
            hoverLine.style.left = `${mouseX}px`;
            hoverLine.style.zIndex = '998'; // Ajouter un z-index élevé
            
            // Supprimer l'affichage de l'élément de valeur qui suit la courbe
            if (this.options.hoverValueElement) {
              this.options.hoverValueElement.style.display = 'none';
            }
          }
          
          this.hoverPoint = null;
        } else {
          // If we couldn't find surrounding points, hide tooltip
          this.hoverTooltipElement.style.display = 'none';
          if (this.options.hoverLineElement) {
            this.options.hoverLineElement.style.display = 'none';
          }
          if (this.options.hoverValueElement) {
            this.options.hoverValueElement.style.display = 'none';
          }
          this.hoverPoint = null;
        }
      }
    } else {
      // For simplified view, just update hover point
      if (closestDistance < 15) {
        this.hoverPoint = closestPoint;
        this.canvas.style.cursor = 'pointer';
      } else {
        this.hoverPoint = null;
        // Default cursor for graph is pointer to indicate it can be clicked
        this.canvas.style.cursor = 'pointer';
      }
      
      // Hide hover tooltip for simplified view when not hovering min/max
      if (!this.options.simplified && this.hoverTooltipElement) {
        this.hoverTooltipElement.style.display = 'none';
      }
    }
    
    // Clean up when mouse leaves
    this.canvas.addEventListener('mouseleave', () => {
      if (this.hoverTooltipElement) {
        this.hoverTooltipElement.style.display = 'none';
      }
      if (this.options.hoverLineElement) {
        this.options.hoverLineElement.style.display = 'none';
      }
      if (this.options.hoverValueElement) {
        this.options.hoverValueElement.style.display = 'none';
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
  
  // Function to fetch mock data (replace with actual API in production)
  static generateMockData(days = 30) {
    const data = [];
    const now = new Date();
    const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    let users = Math.floor(Math.random() * 100) + 50;
    
    for (let time = startTime; time <= now; time = new Date(time.getTime() + 5 * 60 * 1000)) {
      // Random walk with trend
      const trend = Math.sin(time.getHours() / 24 * Math.PI) * 5; // Daily cycle
      const change = Math.random() * 4 - 2 + trend;
      users = Math.max(0, users + change);
      
      data.push({
        timestamp: new Date(time),
        users: Math.floor(users)
      });
    }
    
    return data;
  }
  
  // Add this new method to fetch data when viewport changes
  async fetchDataForViewport() {
    // No need to fetch if we don't have a Cape ID
    if (!this.capeId || this.capeId === 'unknown') return;
    
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
    
    if (!needToFetchStart && !needToFetchEnd) return;
    
    // Calculate padding for fetching more data
    const padding = currentViewportRange * this.fetchPadding;
    
    // Set the range to fetch
    const fetchStart = Math.max(
      new Date('2010-01-01').getTime(), 
      this.viewportStart - padding
    );
    const fetchEnd = Math.min(
      new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
      this.viewportEnd + padding
    );
    
    // Check if this request recently failed to avoid spamming failed requests
    if (capeDataCache.hasRecentlyFailed(this.capeId, fetchStart, fetchEnd)) {
      console.warn(`Skipping fetch for cape ${this.capeId}: recent request failed`);
      return;
    }
    
    // Check if we already have this data in cache
    if (capeDataCache.isTimeRangeCached(this.capeId, fetchStart, fetchEnd)) {
      const data = capeDataCache.getDataForTimeRange(this.capeId, fetchStart, fetchEnd);
      
      // Merge with existing data if needed
      if (this.data && this.data.length > 0) {
        const existingTimestamps = new Set(this.data.map(d => d.timestamp.getTime()));
        const newData = data.filter(d => !existingTimestamps.has(d.timestamp.getTime()));
        
        if (newData.length > 0) {
          this.data = [...this.data, ...newData].sort((a, b) => a.timestamp - b.timestamp);
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
    
    // If we need to fetch, show loading indicator
    const graphLoadingIndicators = document.querySelectorAll('.graph-loading-indicator');
    graphLoadingIndicators.forEach(indicator => {
      indicator.style.display = 'flex';
    });
    
    try {
      // Fetch data from API
      const apiUrl = `https://capes.api.fyz.sh/${this.capeId}/usage?start=${fetchStart}&end=${fetchEnd}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform data
      const formattedData = data.map(point => ({
        timestamp: new Date(point.timestamp),
        users: point.users
      }));
      
      // Add to cache
      capeDataCache.addData(this.capeId, formattedData, fetchStart, fetchEnd);
      
      // Merge with existing data
      if (this.data && this.data.length > 0) {
        const existingTimestamps = new Set(this.data.map(d => d.timestamp.getTime()));
        const newData = formattedData.filter(d => !existingTimestamps.has(d.timestamp.getTime()));
        
        if (newData.length > 0) {
          this.data = [...this.data, ...newData].sort((a, b) => a.timestamp - b.timestamp);
        }
      } else {
        this.setData(formattedData);
      }
      
      // Update last fetched viewport
      this.lastFetchedViewport = {
        start: Math.min(this.lastFetchedViewport.start || Infinity, fetchStart),
        end: Math.max(this.lastFetchedViewport.end || 0, fetchEnd)
      };
      
    } catch (error) {
      console.error('Error fetching additional data:', error);
      
      // Record this as a failed request to avoid retrying too often
      capeDataCache.addFailedRequest(this.capeId, fetchStart, fetchEnd);
      
      // Show error message to user
      const errorMessage = document.createElement('div');
      errorMessage.classList.add('graph-error-message');
      errorMessage.style.position = 'absolute';
      errorMessage.style.top = '10px';
      errorMessage.style.left = '50%';
      errorMessage.style.transform = 'translateX(-50%)';
      errorMessage.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
      errorMessage.style.color = 'white';
      errorMessage.style.padding = '8px 16px';
      errorMessage.style.borderRadius = '4px';
      errorMessage.style.zIndex = '1000';
      errorMessage.style.fontSize = '14px';
      errorMessage.textContent = 'Failed to load data. Please try again later.';
      
      // Add to graph container and remove after 5 seconds
      const graphContainer = this.canvas.parentElement;
      graphContainer.appendChild(errorMessage);
      setTimeout(() => {
        if (errorMessage.parentNode === graphContainer) {
          graphContainer.removeChild(errorMessage);
        }
      }, 5000);
      
      // In case of failure, we keep the existing data
    } finally {
      // Hide loading indicator
      graphLoadingIndicators.forEach(indicator => {
        indicator.style.display = 'none';
      });
      
      // Redraw graph with whatever data we have
      this.draw();
    }
  }
  
  validateViewport() {
    const now = new Date().getTime();
    const minAllowedTime = new Date('2010-01-01').getTime(); // More restrictive
    const maxAllowedTime = now + 7 * 24 * 60 * 60 * 1000; // Only 1 week into future
    
    // Limit start time
    this.viewportStart = Math.max(this.viewportStart, minAllowedTime);
    
    // Limit end time
    this.viewportEnd = Math.min(this.viewportEnd, maxAllowedTime);
    
    // Ensure the viewport isn't too large (max 10 years)
    const maxTimeRange = 10 * 365 * 24 * 60 * 60 * 1000;
    if (this.viewportEnd - this.viewportStart > maxTimeRange) {
      this.viewportStart = this.viewportEnd - maxTimeRange;
    }
    
    // Ensure the viewport isn't too small (min 1 hour)
    const minTimeRange = 60 * 60 * 1000;
    if (this.viewportEnd - this.viewportStart < minTimeRange) {
      this.viewportEnd = this.viewportStart + minTimeRange;
    }
    
    // Fetch data for new viewport if needed
    this.fetchDataForViewport();
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
}

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
    return this.cacheData[capeId].data.filter(
      item => item.timestamp >= startTime && item.timestamp <= endTime
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
const capeDataCache = new CapeDataCache();

// Function to create the usage graph card
const createUsageGraphCard = (capeId) => {
  const graphCard = document.createElement('div');
  graphCard.className = 'card mb-3';
  graphCard.innerHTML = `
    <div class="d-flex flex-column">
      <div class="card-header py-1">
        <div class="d-flex justify-content-between align-items-center">
          <strong>History</strong>
          <div class="btn-group btn-group-sm" role="group">
            <button type="button" class="btn btn-outline-secondary btn-sm graph-timeframe" data-timeframe="day">Day</button>
            <button type="button" class="btn btn-outline-secondary btn-sm graph-timeframe active" data-timeframe="week">Week</button>
            <button type="button" class="btn btn-outline-secondary btn-sm graph-timeframe" data-timeframe="month">Month</button>
            <button type="button" class="btn btn-outline-secondary btn-sm graph-timeframe" data-timeframe="year">Year</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" id="expand-graph">
              <i class="fas fa-expand"></i>
            </button>
          </div>
        </div>
        <div id="graph-stats" class="d-flex justify-content-between mt-2 text-muted" style="font-size: 12px;">
          <span>Current: <span id="stat-current">-</span></span>
          <span>Max: <span id="stat-max">-</span></span>
          <span>Min: <span id="stat-min">-</span></span>
          <span>Avg: <span id="stat-avg">-</span></span>
        </div>
      </div>
      <div class="card-body py-2">
        <div id="graph-container" style="position: relative; height: 300px; width: 100%;">
          <canvas id="usage-graph" style="width: 100%; height: 100%;"></canvas>
          <div id="tooltip" style="position: absolute; display: none; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; pointer-events: none; z-index: 100; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
          <div id="hover-line" style="position: absolute; display: none; width: 1px; background: rgba(0,0,0,0.3); pointer-events: none; top: 0; bottom: 0;"></div>
          <div id="hover-value" style="position: absolute; display: none; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; pointer-events: none; z-index: 100;"></div>
          <div class="graph-loading-indicator" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.7); display: none; justify-content: center; align-items: center; z-index: 110;">
            <div class="text-center">
              <div class="spinner-border text-primary mb-2" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
              <div>Chargement des données...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create modal HTML structure
  const modalHtml = `
    <div id="graph-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 1050; overflow: auto;">
      <div class="modal-dialog modal-xl" style="margin: 2% auto; width: 90%; max-width: 1200px;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cape Usage Statistics</h5>
            <button type="button" class="btn btn-outline-secondary rounded-circle" id="close-modal" aria-label="Close" style="width: 32px; height: 32px; padding: 0; line-height: 1;">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <div class="btn-group btn-group-sm" role="group">
                  <button type="button" class="btn btn-outline-secondary btn-sm modal-timeframe active" data-timeframe="day">Day</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm modal-timeframe" data-timeframe="week">Week</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm modal-timeframe" data-timeframe="month">Month</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm modal-timeframe" data-timeframe="year">Year</button>
                </div>
                <div class="btn-group btn-group-sm" role="group">
                  <button type="button" class="btn btn-outline-secondary btn-sm" id="modal-reset-zoom">
                    <i class="fas fa-sync-alt"></i> Reset Zoom
                  </button>
                  <button type="button" class="btn btn-outline-info btn-sm" id="modal-help">
                    <i class="fas fa-info-circle"></i> Help
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
                    <div class="col-md-3">
                      <div class="d-flex flex-column align-items-center">
                        <div class="text-muted small">Current</div>
                        <div class="h4" id="modal-stat-current">-</div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="d-flex flex-column align-items-center">
                        <div class="text-muted small">Maximum</div>
                        <div class="h4" id="modal-stat-max">-</div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="d-flex flex-column align-items-center">
                        <div class="text-muted small">Minimum</div>
                        <div class="h4" id="modal-stat-min">-</div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="d-flex flex-column align-items-center">
                        <div class="text-muted small">Average</div>
                        <div class="h4" id="modal-stat-avg">-</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id="modal-graph-container" style="position: relative; height: 60vh; width: 100%;">
              <canvas id="modal-usage-graph" style="width: 100%; height: 100%; position: relative; z-index: 1;"></canvas>
              <div id="modal-hover-line" style="position: absolute; display: none; width: 1px; background: rgba(0,0,0,0.3); pointer-events: none; top: 0; bottom: 0; z-index: 2;"></div>
              <!-- Suppression de l'élément modal-hover-value qui était affiché au-dessus de la courbe -->
              <div class="graph-loading-indicator" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.7); display: none; justify-content: center; align-items: center; z-index: 110;">
                <div class="text-center">
                  <div class="spinner-border text-primary mb-2" role="status">
                    <span class="visually-hidden">Chargement...</span>
                  </div>
                  <div>Chargement des données...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Append modal HTML to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  return graphCard;
};

// Initialize the graph
const initializeGraph = (capeId) => {
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
      min: document.getElementById('stat-min'),
      avg: document.getElementById('stat-avg')
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
          min: document.getElementById('modal-stat-min'),
          avg: document.getElementById('modal-stat-avg')
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
      
      // Ensure modal graph is properly sized
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
        modal.style.display = 'none';
      }
    });
  }
  
  // Close modal when clicking outside
  const modal = document.getElementById('graph-modal');
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.style.display === 'block') {
        modal.style.display = 'none';
      }
    });
  }
};

// No longer need loadGraphUtils - we've defined everything inline
// just create a simple function that returns a resolved promise
const loadGraphUtils = () => Promise.resolve();

const waitForSelector = function (selector, callback) {
  query = document.querySelector(selector)
  if (query) {
    setTimeout((query) => {
      callback(query);
    }, null, query);
  } else {
    setTimeout(() => {
      waitForSelector(selector, callback);
    });
  }
};

const waitForFunc = function (func, callback) {
  if (window[func] ?? window.wrappedJSObject?.[func]) {
    setTimeout(() => {
      callback(window[func] ?? window.wrappedJSObject?.[func]);
    });
  } else {
    setTimeout(() => {
      waitForFunc(func, callback);
    });
  }
};

const waitForStorage = function (key, callback) {
  if (window.localStorage.getItem(key) && window.localStorage.getItem(key).length != 0) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForStorage(key, callback);
    });
  }
};

const waitForTooltip = function (callback) {
  if (typeof $ != 'undefined' && typeof $().tooltip != 'undefined') {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForTooltip(callback);
    });
  }
};

const waitForCape = function (callback) {
  if (skinViewer.capeTexture) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForCape(callback);
    });
  }
};

const downloadCape = () => {
  var a = document.createElement("a");
  a.href = skinViewer.capeCanvas.toDataURL();
  a.setAttribute("download", "cape");
  a.click();
}

const fixPauseBtn = () => {
  setTimeout(() => {
    var pauseBtn = document.querySelector('#play-pause-btn');
    var pauseIcon = pauseBtn.querySelector('i');
    if (paused == true) {
      pauseIcon.classList.remove('fa-pause');
      pauseIcon.classList.add('fa-play');
    } else {
      pauseIcon.classList.remove('fa-play');
      pauseIcon.classList.add('fa-pause');
    }
    pauseBtn.setAttribute('onclick', '');
    pauseBtn.onclick = () => {
      if (paused == false) {
        paused = true;
        pauseIcon.classList.remove('fa-pause');
        pauseIcon.classList.add('fa-play');
      } else {
        paused = false;
        pauseIcon.classList.remove('fa-play');
        pauseIcon.classList.add('fa-pause');
      }
      setCookie("animate", !paused);
      skinViewer.animation.paused = paused;
    }
  })
}

const fixElytraBtn = () => {
  setTimeout(() => {
    document.querySelector('#elytra-btn').onclick = () => {
      var elytraIconEl = document.querySelector('#elytra-btn i');
      if (!elytraOn) {
        elytraOn = true;
        elytraIconEl.classList.remove('fa-dove');
        elytraIconEl.classList.add('fa-square');
        elytraIconEl.parentElement.title = "No Elytra"
        skinViewer.loadCape(skinViewer.capeCanvas.toDataURL(), {
          backEquipment: "elytra"
        });
      } else {
        elytraOn = false;
        elytraIconEl.classList.remove('fa-square');
        elytraIconEl.classList.add('fa-dove');
        elytraIconEl.parentElement.title = "Elytra"
        skinViewer.loadCape(skinViewer.capeCanvas.toDataURL());
      }
    }
  })
}

const fixStealBtn = () => {
  setTimeout(() => {
    document.querySelector('#steal-btn').onclick = () => {
      // get cape id (last "/" of url... account for query params)
      const capeId = location.pathname.split("/").slice(-1)[0].split("?")[0];
      window.location.href = `${location.origin}/extras/skin-cape-test?cape=${capeId}&nmceCape=1`;
    }
  })
}

const fixDownloadBtn = () => {
  setTimeout(() => {
    document.querySelector('#download-btn').onclick = downloadCape;
  })
}

/*
 * UNIVERSAL VARIABLES
 */

const categoryId = location.pathname.split("/")[2];
const capeId = location.pathname.split("/")[3];
var paused = (getCookie("animate") === "false");
var elytraOn = false;

/*
 * CLASSES
 */

class CustomCape {
  /**
   * @param {string} name 
   * @param {string} description 
   * @param {string} capeURL 
   * @param {string[]} users 
   */
  constructor(name, description, capeURL, users) {
    this.name = name;
    this.description = description;
    this.capeURL = capeURL;
    this.users = users;
  }
}





/*
 * FUNCTIONS
 */

async function loadPage(mainDiv) {
  console.log("Loading page!")

  // get cape and update page title
  const supabase_data = JSON.parse(localStorage.getItem("supabase_data"));
  let cape;
  if (categoryId == "bedrock") {
    const bedrockInfo = await (await fetch(`https://bedrock.lol/api/v1/capes/${capeId}`)).json();
    cape = new CustomCape(bedrockInfo.name, bedrockInfo.description, bedrockInfo.image_data, bedrockInfo.users);
    cape.user_count = bedrockInfo.user_count;
    console.log(cape);
  } else {
    cape = supabase_data.capes.filter(cape => cape.id == capeId)[0];
    console.log(cape);
  }
  console.log("Cape : ");
  console.log(cape);
  if (!cape) return;
  const capeCategory = supabase_data.categories.filter(a => a.id == cape.category)[0]?.name ?? "Bedrock";
  document.title = `${cape.name} | ${capeCategory} Cape | NameMC Extras`
  let capeOwners = supabase_data.user_capes.filter(user => user.cape == capeId);
  if (capeOwners.length == 0) {
    capeOwners = cape.users;
  }
  console.log("Cape owners :")
  console.log(capeOwners)
  // update page
  var capeRange = document.createRange();
  var capeHTML = capeRange.createContextualFragment(`
    ${(() => {
      var titleEl = document.createElement("h1");
      titleEl.classList.add("text-center");
      titleEl.translate = "no";
      titleEl.textContent = `
      ${cape.name} 
      `;

      var smallEl = document.createElement("small");
      smallEl.classList.add("text-muted");
      smallEl.classList.add("text-nowrap")
      smallEl.textContent = capeCategory + " Cape"
      titleEl.append(smallEl)

      return titleEl.outerHTML;
    })()}
    <hr class="mt-0">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-body position-relative text-center p-0 checkered animation-paused">
            <canvas class="drop-shadow auto-size align-top" width="300" height="400" style="touch-action: none; width: 300px; height: 400px;"></canvas>
            <button id="play-pause-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;">
              <i class="fas fa-play"></i>
            </button>
            <button id="download-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;margin-top:50px!important;" title="Download Cape">
              <i class="fas fa-download"></i>
            </button>
            <button id="elytra-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;margin-top:92.5px!important;" title="Elytra">
              <i class="fas fa-dove"></i>
            </button>
            ${capeCategory == "Bedrock" ? "" : `
              <button id="steal-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;margin-top:135px!important;" title="Steal Cape">
                <i class="fas fa-user-secret"></i>
              </button>  
            `}
            <h5 class="position-absolute bottom-0 end-0 m-1 text-muted">${cape.user_count || capeOwners.length}★</h5>
          </div>
        </div>
        <div class="card mb-3">
          <div class="d-flex flex-column" style="max-height: 25rem">
            <div class="card-header py-1">
              <strong>Description</strong>
            </div>
            ${(() => {
      var cardBody = document.createElement("div");
      cardBody.classList.add("card-body");
      cardBody.classList.add("py-2");
      cardBody.textContent = cape.description ?? "Awarded for something pretty cool this person did... I think?\nNo description available, contact a NameMC Extras developer!";

      return cardBody.outerHTML;
    })()}
          </div>
        </div>
        <div id="graph-container"></div>
      </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="d-flex flex-column" style="max-height: 25rem">
              <div class="card-header py-1"><strong>Profiles (${cape.user_count || capeOwners.length})</strong></div>
              <div class="card-body player-list py-2"><div class="col-auto saving text-center"><span>•</span><span>•</span><span>•</span></div>
              </div>
            </div>
          </div>
        </div>
    </div>
  `);

  mainDiv.append(capeHTML)

  // Add the graph card after loading utils
  loadGraphUtils().then(() => {
    const graphCard = createUsageGraphCard(capeId);
    document.getElementById('graph-container').appendChild(graphCard);
    
    // Initialize graph after everything is set up
    setTimeout(() => {
      initializeGraph(capeId);
    }, 100);
  });

  // create skin viewer
  waitForFunc("skinview3d", () => {
    const skinContainer = document.getElementsByTagName("canvas").item(0);
    const steveDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABJlBMVEVMaXEAf38AqKgAmZmqfWaWX0EAaGhGOqUwKHIAr691Ry8qHQ1qQDA/Pz9ra2smIVuHVTuWb1sAYGBWScwoKCgmGgovHw8AzMw6MYkkGAgoGwoAW1sjIyMAnp5RMSWGUzQsHg4pHAyBUzkrHg0fEAsoGg0mGAstHQ6aY0QnGwstIBB3QjWcZ0gzJBEyIxBiQy8rHg6dak8mGgwsHhGKWTsoGwsjFwmEUjF0SC+iakd6TjOHWDokGAqDVTucY0WIWjk6KBQoHAsvIhGcaUz///+0hG27iXJSPYlSKCaaZEqfaEmPXj4vIA2AUzQ0JRJvRSxtQyqQXkOsdlo/KhWcY0aWX0Cze2K+iGytgG1CKhK1e2e9jnK9i3K2iWycclzGloC9jnS3gnKSJOIgAAAAAXRSTlMAQObYZgAAAvxJREFUWMPtlmebojAQx5cEkAiecHcgwrGArPW2997b9d779/8SN0nMruK6oL71//iYocyPmTA6MzPTla5X4VOdK3Y1M6r0quMAoFo0QiMMxwE4js0BT0DG6ICqQ3Nw9LEB4GvbziQA5i8A12MAbCe25yiAaQxAbIN0feTX6Hl2O17sdF4mzknVTvROZzFu254n6iIPwI7iZCFJkoVvH6KThSSObAro1kUmIGrY8fLGfpz8+vHn59/3r+P9jeXYbkSiLrIjqDcjrx2dyhfy19+XZ2enUduLmnVP1EWOFLzVzb3D44vzq++XV+fy8eHe5iqcFHWRA1BvrG0pRx8//zOMLzuvjpSttUadbiKvi+w98JpLK62w+O7TU9CLWjFsrSw1vUjURSYgDFvhvLK+/eZtrbZ7cLC7vf58/tl8C36QtC6KYa5aeAR6DBLHFV5LlYddifOoUkHGrDGbDeDlPACogCYFIPA3JkphAKBpZa0AgoWuriRJPg5qO7VaEIAtBQghQhDiNmErAd0Cyn2AgqSqEkIB+BMCtoro3QAAUyKIBPR6CqD1AdiNBAUYPMFWCRdiYMKg9wN8VfXheoDhi9uYIMwBENQ9EYDhglTf9zGmbhiD6TNvOFYUxZRBhh07Qe4boHuBQWAj4r5QzHAVMIOEAdYsqyYdwF694ACIADEALAH1BsgJgdYDGBZPQBNG3gLAiCxTbwB0CdTgNkfgQBotwDCvAgWG0YFfhygpAClkgCUSg9AkipJGNMAOABstg0KB8gKjQRS6QFwR7FCKmUKLLgAoEXmughjt8ABlswiyQCwiICARXlj+KJPBj/LTEcw1VRTTTXKvICGdeXcAwdoIgAaNliMkkJuQO+84NI+AYL/+GBgLsgGlG8aTQBNQuq2+vwArdzbqdBAWx8FcOdcMBSQmheGzgXDAWU+L9wAREvLC0ilQAEWB5h9c0E2gKdiMgDrymbOCLQUQOEAMycgPS8o3dzpaENTyQHob/fsydYkAMjdsthocyfgP7DZYc3t4J05AAAAAElFTkSuQmCC";
    const capeURL = cape.image_src ?? ("data:image/png;base64," + cape.capeURL);

    let skinViewer = new skinview3d.SkinViewer({
      canvas: skinContainer,
      width: 300,
      height: 400,
      skin: steveDataURL,
      cape: capeURL,
      preserveDrawingBuffer: true
    });

    skinViewer.controls.enableRotate = true;
    skinViewer.controls.enableZoom = false;
    skinViewer.controls.enablePan = false;

    skinViewer.animation = new skinview3d.WalkingAnimation();
    skinViewer.animation.speed = 0.5;
    skinViewer.animation.paused = paused
    skinViewer.animation.headBobbing = false;

    window.skinViewer = skinViewer;

    skinViewer.fov = 40;
    skinViewer.camera.position.y = 22 * Math.cos(.01);
    skinViewer.playerWrapper.rotation.y = -90.58;
    skinViewer.globalLight.intensity = .65;
    skinViewer.cameraLight.intensity = .38;
    skinViewer.cameraLight.position.set(12, 25, 0);
    skinViewer.zoom = 0.86

    if (paused) {
      skinViewer.playerObject.skin.leftArm.rotation.x = 0.3
      skinViewer.playerObject.skin.rightArm.rotation.x = -0.3

      skinViewer.playerObject.skin.leftLeg.rotation.x = -0.36
      skinViewer.playerObject.skin.rightLeg.rotation.x = 0.36
    }


    skinContainer.addEventListener(
      "contextmenu",
      (event) => event.stopImmediatePropagation(),
      true
    );

    fixPauseBtn()
    waitForCape(fixDownloadBtn)
    waitForCape(fixElytraBtn);
    if (capeCategory != "Bedrock") {
      waitForCape(fixStealBtn);
    }
  })

  var badgeOwnerNames;
  if (capeCategory == "Bedrock") {
    capeOwners.push({ username: "..." });
    badgeOwnerNames = capeOwners.map(u => u.username);
  } else {
    badgeOwnerNames = (await Promise.all(capeOwners.map(async badge => {
      const resp = await fetch("https://api.gapple.pw/cors/sessionserver/" + badge.user);
      return await resp.json();
    }))).map(a => a.name);
  }

  document.querySelector(".player-list").innerHTML = capeOwners.map((u, i) => {
    var userEl;
    if (capeCategory == "Bedrock") {
      if (u.java_uuid) {
        userEl = document.createElement("a");
        userEl.href = "/profile/" + u.java_uuid;
      } else {
        userEl = document.createElement("span");
      }
      userEl.textContent = u.username;
    } else {
      var userEl = document.createElement("a");
      userEl.href = "/profile/" + u.user;
    }
    userEl.textContent = badgeOwnerNames[i];
    userEl.translate = "no";
    if (u.note) {
      userEl.setAttribute("data-note", "");
      userEl.title = u.note;
    }

    return userEl.outerHTML;
  }).join(" ");

  waitForTooltip(() => {
    var iframeEl = document.createElement("iframe");
    iframeEl.width = 0;
    iframeEl.height = 0;
    iframeEl.id = "nmcIf";
    iframeEl.srcdoc = `<script>
            window.top.$("[data-note]").tooltip()
        </script>`;
    document.documentElement.append(iframeEl);
    setTimeout(() => iframeEl.remove(), 1000)
  });
}





/*
 * MAIN LOGIC
 */

waitForStorage("supabase_data", () => waitForSelector("main", loadPage));

// Improved function to retrieve cape data with caching
async function getCapeUsageData(capeId, timeframe = 'week') {
  // Calculate the time range based on the timeframe
  const now = new Date();
  let startTime, endTime = now.getTime();
  
  switch (timeframe) {
    case 'day':
      startTime = new Date(now - 24 * 60 * 60 * 1000).getTime();
      break;
    case 'week':
      startTime = new Date(now - 7 * 24 * 60 * 60 * 1000).getTime();
      break;
    case 'month':
      startTime = new Date(now - 30 * 24 * 60 * 60 * 1000).getTime();
      break;
    case 'year':
      startTime = new Date(now - 365 * 24 * 60 * 60 * 1000).getTime();
      break;
    default:
      startTime = new Date(now - 30 * 24 * 60 * 60 * 1000).getTime();
  }
  
  // Extend the range slightly to preload additional data
  // (10% before and 10% after)
  const padding = (endTime - startTime) * 0.1;
  const extendedStart = Math.max(startTime - padding, new Date('2010-01-01').getTime());
  const extendedEnd = Math.min(endTime + padding, now.getTime() + 24 * 60 * 60 * 1000);
  
  // Check if this request recently failed
  if (capeDataCache.hasRecentlyFailed(capeId, extendedStart, extendedEnd)) {
    console.warn(`Skipping fetch for cape ${capeId} (${timeframe}): recent request failed`);
    
    // Show error message
    showErrorMessage('Could not load data. Please try again later.');
    
    // Return simulated data as fallback
    return CapeUsageGraph.generateMockData(
      timeframe === 'day' ? 1 :
      timeframe === 'week' ? 7 :
      timeframe === 'month' ? 30 :
      timeframe === 'year' ? 365 : 30
    );
  }
  
  // Check if the data is already cached
  if (capeDataCache.isTimeRangeCached(capeId, startTime, endTime)) {
    console.log(`Data for cape ${capeId} (${timeframe}) already cached`);
    return capeDataCache.getDataForTimeRange(capeId, startTime, endTime);
  }
  
  // Check if a similar request is already in progress
  if (capeDataCache.isPendingRequest(capeId, extendedStart, extendedEnd)) {
    console.log(`Request already in progress for cape ${capeId} (${timeframe})`);
    // Wait for the request to finish then filter the data
    const pendingRequest = capeDataCache.pendingRequests[capeId].find(
      req => req.startTime <= extendedStart && req.endTime >= extendedEnd
    );
    
    await pendingRequest.promise;
    return capeDataCache.getDataForTimeRange(capeId, startTime, endTime);
  }
  
  // Prepare the API request
  console.log(`Retrieving data for cape ${capeId} (${timeframe})`);
  
  // Create and track the loading promise
  const fetchPromise = (async () => {
    try {
      // URL of the API with parameters for the time range
      const apiUrl = `https://capes.api.fyz.sh/${capeId}/usage?start=${extendedStart}&end=${extendedEnd}`;
      
      // Display a loading indicator on the graph
      document.querySelectorAll('.graph-loading-indicator').forEach(el => {
        el.style.display = 'flex';
      });
      
      // Fetch data from the API
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert timestamps to Date objects
      const formattedData = data.map(item => ({
        timestamp: new Date(item.timestamp),
        users: item.users
      }));
      
      // Hide the loading indicator
      document.querySelectorAll('.graph-loading-indicator').forEach(el => {
        el.style.display = 'none';
      });
      
      // Add the data to the cache
      capeDataCache.addData(capeId, formattedData, extendedStart, extendedEnd);
      
      return formattedData;
    } catch (error) {
      console.error('Error retrieving cape data:', error);
      
      // Record this as a failed request
      capeDataCache.addFailedRequest(capeId, extendedStart, extendedEnd);
      
      // Hide the loading indicator
      document.querySelectorAll('.graph-loading-indicator').forEach(el => {
        el.style.display = 'none';
      });
      
      // Show error message
      showErrorMessage('Failed to load data. Please try again later.');
      
      // In case of error, return simulated data
      return CapeUsageGraph.generateMockData(
        timeframe === 'day' ? 1 :
        timeframe === 'week' ? 7 :
        timeframe === 'month' ? 30 :
        timeframe === 'year' ? 365 : 30
      );
    }
  })();
  
  // Register the request
  capeDataCache.addPendingRequest(capeId, extendedStart, extendedEnd, fetchPromise);
  
  // Wait for the request to finish
  await fetchPromise;
  
  // Remove the request from the list of pending requests
  capeDataCache.removePendingRequest(capeId, fetchPromise);
  
  // Retrieve the requested data from the cache
  return capeDataCache.getDataForTimeRange(capeId, startTime, endTime);
}

// Helper function to show error messages in graph containers
function showErrorMessage(message) {
  // Remove any existing error messages
  document.querySelectorAll('.graph-error-message').forEach(el => el.remove());
  
  // Get all graph containers
  const graphContainers = document.querySelectorAll('.graph-container');
  
  graphContainers.forEach(container => {
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('graph-error-message');
    errorMessage.style.position = 'absolute';
    errorMessage.style.top = '10px';
    errorMessage.style.left = '50%';
    errorMessage.style.transform = 'translateX(-50%)';
    errorMessage.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
    errorMessage.style.color = 'white';
    errorMessage.style.padding = '8px 16px';
    errorMessage.style.borderRadius = '4px';
    errorMessage.style.zIndex = '1000';
    errorMessage.style.fontSize = '14px';
    errorMessage.textContent = message;
    
    container.appendChild(errorMessage);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (errorMessage.parentNode === container) {
        container.removeChild(errorMessage);
      }
    }, 5000);
  });
}
