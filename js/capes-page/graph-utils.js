// Cape usage graph utilities

window.CapeUsageGraph = class CapeUsageGraph {
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
      pointRadius: 3
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
    
    // Add event listeners
    this.addEventListeners();
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
    const p = this.options.padding;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
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
    this.drawGrid();
    
    // Draw axes
    this.drawAxes();
    
    // Draw data
    ctx.beginPath();
    ctx.strokeStyle = this.options.lineColor;
    ctx.lineWidth = 2;
    
    visibleData.forEach((point, i) => {
      const x = this.timeToX(point.timestamp);
      const y = this.userCountToY(point.users);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw points
    visibleData.forEach(point => {
      const x = this.timeToX(point.timestamp);
      const y = this.userCountToY(point.users);
      
      ctx.beginPath();
      ctx.arc(x, y, this.options.pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.options.lineColor;
      ctx.fill();
    });
    
    // Draw legend/stats
    this.drawStats(visibleData);
  }
  
  drawNoData(message = "No data available") {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    
    ctx.fillStyle = this.options.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px Arial';
    ctx.fillText(message, width / 2, height / 2);
  }
  
  drawGrid() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const p = this.options.padding;
    
    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    const userStep = Math.ceil(this.maxUsers / 5);
    for (let i = 0; i <= this.maxUsers; i += userStep) {
      const y = this.userCountToY(i);
      ctx.beginPath();
      ctx.moveTo(p, y);
      ctx.lineTo(width - p, y);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = this.options.textColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '12px Arial';
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
      const x = this.timeToX(time);
      
      ctx.beginPath();
      ctx.moveTo(x, p);
      ctx.lineTo(x, height - p);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = this.options.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '12px Arial';
      ctx.fillText(format(time), x, height - p + 5);
    }
  }
  
  drawAxes() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
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
    ctx.font = 'bold 12px Arial';
    
    // X axis label
    ctx.fillText('Time', width / 2, height - 10);
    
    // Y axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Users', 0, 0);
    ctx.restore();
  }
  
  drawStats(visibleData) {
    if (!visibleData.length) return;
    
    const ctx = this.ctx;
    const { width } = this.canvas;
    const p = this.options.padding;
    
    const currentUsers = visibleData[visibleData.length - 1].users;
    const maxUsers = Math.max(...visibleData.map(d => d.users));
    const minUsers = Math.min(...visibleData.map(d => d.users));
    const avgUsers = visibleData.reduce((sum, d) => sum + d.users, 0) / visibleData.length;
    
    const stats = [
      `Current: ${currentUsers}`,
      `Max: ${maxUsers}`,
      `Min: ${minUsers}`,
      `Avg: ${Math.round(avgUsers)}`
    ];
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(width - p - 100, p, 100, 80);
    
    ctx.fillStyle = this.options.textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '12px Arial';
    
    stats.forEach((stat, i) => {
      ctx.fillText(stat, width - p - 95, p + 5 + i * 18);
    });
  }
  
  timeToX(time) {
    const { width } = this.canvas;
    const p = this.options.padding;
    const timestamp = time instanceof Date ? time.getTime() : time;
    
    return p + (timestamp - this.viewportStart) / (this.viewportEnd - this.viewportStart) * (width - 2 * p);
  }
  
  userCountToY(users) {
    const { height } = this.canvas;
    const p = this.options.padding;
    
    return height - p - (users / this.maxUsers) * (height - 2 * p);
  }
  
  xToTime(x) {
    const { width } = this.canvas;
    const p = this.options.padding;
    
    const percent = (x - p) / (width - 2 * p);
    return this.viewportStart + percent * (this.viewportEnd - this.viewportStart);
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
      if (!this.isDragging) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const dx = mouseX - this.dragStart.x;
      
      // Convert pixel movement to time delta
      const timeRange = this.dragStart.timeEnd - this.dragStart.timeStart;
      const timeDelta = -dx / (this.canvas.width - 2 * this.options.padding) * timeRange;
      
      this.viewportStart = this.dragStart.timeStart + timeDelta;
      this.viewportEnd = this.dragStart.timeEnd + timeDelta;
      
      this.draw();
    });
    
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
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
window.getCapeUsageData = async function(capeId, timeframe = 'week') {
  // In a real implementation, this would fetch from an API
  // For now, generate mock data
  return window.CapeUsageGraph.generateMockData(
    timeframe === 'day' ? 1 :
    timeframe === 'week' ? 7 :
    timeframe === 'month' ? 30 :
    timeframe === 'year' ? 365 : 30
  );
} 