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
    
    // Make canvas responsive
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Add event listeners
    this.addEventListeners();
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
    
    if (!this.data.length) return;
    
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
        this.viewportStart = this.startTimestamp.getTime();
    }
    
    this.viewportEnd = now.getTime();
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
    
    if (!this.data.length) {
      this.drawNoData();
      return;
    }
    
    // Filter data points in current viewport
    const visibleData = this.data.filter(d => {
      const timestamp = d.timestamp.getTime();
      return timestamp >= this.viewportStart && timestamp <= this.viewportEnd;
    });
    
    if (visibleData.length === 0) {
      this.drawNoData("No data for selected timeframe");
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
    
    visibleData.forEach((point, i) => {
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
    ctx.lineTo(this.timeToX(visibleData[visibleData.length-1].timestamp, displayWidth), displayHeight - p);
    ctx.lineTo(this.timeToX(visibleData[0].timestamp, displayWidth), displayHeight - p);
    ctx.closePath();
    ctx.fillStyle = `${this.options.lineColor}20`; // 20 = 12.5% opacity
    ctx.fill();
    
    // Draw points
    visibleData.forEach(point => {
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
      ctx.arc(x, y, this.options.pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.options.lineColor;
      ctx.fill();
    });
    
    // Draw legend/stats
    this.drawStats(visibleData, displayWidth, displayHeight);
  }
  
  drawNoData(message = "No data available") {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.width / dpr;
    const displayHeight = this.canvas.height / dpr;
    
    ctx.fillStyle = this.options.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 14px ${this.options.fontFamily}`;
    ctx.fillText(message, displayWidth / 2, displayHeight / 2);
  }
  
  drawGrid(width, height) {
    const ctx = this.ctx;
    const p = this.options.padding;
    
    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    const userStep = Math.ceil(this.maxUsers / 5);
    for (let i = 0; i <= this.maxUsers; i += userStep) {
      const y = this.userCountToY(i, height);
      ctx.beginPath();
      ctx.moveTo(p, y);
      ctx.lineTo(width - p, y);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = this.options.textColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = `12px ${this.options.fontFamily}`;
      ctx.fillText(i.toString(), p - 5, y);
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
    
    for (let timestamp = startTime.getTime(); timestamp <= this.viewportEnd; timestamp += timeStep) {
      const time = new Date(timestamp);
      const x = this.timeToX(time, width);
      
      ctx.beginPath();
      ctx.moveTo(x, p);
      ctx.lineTo(x, height - p);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = this.options.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `12px ${this.options.fontFamily}`;
      ctx.fillText(format(time), x, height - p + 5);
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
    
    // Axis labels
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
      const factor = e.deltaY < 0 ? 0.8 : 1.2;
      
      // Apply zoom
      const timeRange = this.viewportEnd - this.viewportStart;
      const newTimeRange = timeRange * factor;
      
      // Calculate new viewport limits
      const mousePercent = (timeAtMouse - this.viewportStart) / timeRange;
      this.viewportStart = timeAtMouse - mousePercent * newTimeRange;
      this.viewportEnd = this.viewportStart + newTimeRange;
      
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
        
        this.viewportStart = this.dragStart.timeStart + timeDelta;
        this.viewportEnd = this.dragStart.timeEnd + timeDelta;
        
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
    if (!this.data.length) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    this.lastHoverPosition = { x: mouseX, y: mouseY };
    
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.width / dpr;
    const displayHeight = this.canvas.height / dpr;
    
    // Convert mouse position to time
    const time = this.xToTime(mouseX, displayWidth);
    
    // Filter visible data
    const visibleData = this.data.filter(d => {
      const timestamp = d.timestamp.getTime();
      return timestamp >= this.viewportStart && timestamp <= this.viewportEnd;
    });
    
    // Find closest point
    let closestPoint = null;
    let minDistance = Infinity;
    
    visibleData.forEach(point => {
      const pointX = this.timeToX(point.timestamp, displayWidth);
      const pointY = this.userCountToY(point.users, displayHeight);
      
      const distance = Math.sqrt(Math.pow(pointX - mouseX, 2) + Math.pow(pointY - mouseY, 2));
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });
    
    // Show hover line
    if (this.options.hoverLineElement) {
      const hoverLine = this.options.hoverLineElement;
      hoverLine.style.display = 'block';
      hoverLine.style.left = `${mouseX}px`;
      
      // Find y value at current x position by interpolating between points
      if (visibleData.length >= 2) {
        // Find the two points surrounding the current mouse position
        let leftPoint = null;
        let rightPoint = null;
        
        for (let i = 0; i < visibleData.length - 1; i++) {
          const currentX = this.timeToX(visibleData[i].timestamp, displayWidth);
          const nextX = this.timeToX(visibleData[i + 1].timestamp, displayWidth);
          
          if (currentX <= mouseX && nextX >= mouseX) {
            leftPoint = visibleData[i];
            rightPoint = visibleData[i + 1];
            break;
          }
        }
        
        // If we found surrounding points, interpolate
        if (leftPoint && rightPoint) {
          const leftX = this.timeToX(leftPoint.timestamp, displayWidth);
          const rightX = this.timeToX(rightPoint.timestamp, displayWidth);
          const ratio = (mouseX - leftX) / (rightX - leftX);
          
          const interpolatedValue = Math.round(leftPoint.users + ratio * (rightPoint.users - leftPoint.users));
          
          // Show hover value
          if (this.options.hoverValueElement) {
            const valueElement = this.options.hoverValueElement;
            valueElement.style.display = 'block';
            valueElement.textContent = `${interpolatedValue} users`;
            
            // Position the value at appropriate y coordinate
            const valueY = this.userCountToY(interpolatedValue, displayHeight);
            valueElement.style.left = `${mouseX + 10}px`;
            valueElement.style.top = `${valueY - 10}px`;
          }
        }
      }
    }
    
    // Check if we're close enough to show the hover effect on point
    if (minDistance <= this.options.hoverRadius) {
      this.hoverPoint = closestPoint;
      
      // Show tooltip
      if (this.options.tooltipContainer) {
        const pointX = this.timeToX(closestPoint.timestamp, displayWidth);
        const pointY = this.userCountToY(closestPoint.users, displayHeight);
        
        const tooltip = this.options.tooltipContainer;
        tooltip.style.display = 'block';
        tooltip.style.left = (pointX + rect.left - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (pointY + rect.top - tooltip.offsetHeight - 10) + 'px';
        
        // Format the date nicely
        const date = closestPoint.timestamp;
        const formattedDate = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        tooltip.innerHTML = `
          <div style="font-weight: bold;">${formattedDate}</div>
          <div>Users: ${closestPoint.users}</div>
        `;
      }
    } else {
      // Hide tooltip
      if (this.options.tooltipContainer) {
        this.options.tooltipContainer.style.display = 'none';
      }
      this.hoverPoint = null;
    }
    
    // Redraw to show hover effects
    this.draw();
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
}

// Mock API function to get cape usage data
async function getCapeUsageData(capeId, timeframe = 'week') {
  // In a real implementation, this would fetch from an API
  // For now, generate mock data
  return CapeUsageGraph.generateMockData(
    timeframe === 'day' ? 1 :
    timeframe === 'week' ? 7 :
    timeframe === 'month' ? 30 :
    timeframe === 'year' ? 365 : 30
  );
}

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
            <button type="button" class="btn btn-outline-secondary btn-sm graph-timeframe active" data-timeframe="day">Day</button>
            <button type="button" class="btn btn-outline-secondary btn-sm graph-timeframe" data-timeframe="week">Week</button>
            <button type="button" class="btn btn-outline-secondary btn-sm graph-timeframe" data-timeframe="month">Month</button>
            <button type="button" class="btn btn-outline-secondary btn-sm graph-timeframe" data-timeframe="year">Year</button>
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
        </div>
      </div>
    </div>
  `;
  
  return graphCard;
};

// Initialize the graph
const initializeGraph = (capeId) => {
  const canvas = document.getElementById('usage-graph');
  const tooltip = document.getElementById('tooltip');
  const hoverLine = document.getElementById('hover-line');
  const hoverValue = document.getElementById('hover-value');
  if (!canvas) return;
  
  // Initialize graph
  const graph = new CapeUsageGraph(canvas, {
    tooltipContainer: tooltip,
    hoverLineElement: hoverLine,
    hoverValueElement: hoverValue,
    statElements: {
      current: document.getElementById('stat-current'),
      max: document.getElementById('stat-max'),
      min: document.getElementById('stat-min'),
      avg: document.getElementById('stat-avg')
    }
  });
  window.capeGraph = graph;
  
  // Load data
  getCapeUsageData(capeId).then(data => {
    graph.setData(data);
  });
  
  // Set up timeframe buttons
  document.querySelectorAll('.graph-timeframe').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.graph-timeframe').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      
      const timeframe = button.getAttribute('data-timeframe');
      graph.setTimeframe(timeframe);
    });
  });
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
