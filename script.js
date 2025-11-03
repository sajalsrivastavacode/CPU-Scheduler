// AI Canvas - Cloud Art Collaboration Platform JavaScript

class AICanvas {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.currentOpacity = 1;
        this.layers = [];
        this.activeLayerId = null;
        this.socket = null;
        this.currentUser = null;
        this.connectedUsers = new Set();
        this.canvasId = this.generateCanvasId();
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupWebSocket();
        this.createInitialLayer();
        this.updateUI();
    }

    generateCanvasId() {
        return 'canvas_' + Math.random().toString(36).substr(2, 9);
    }

    setupCanvas() {
        // Set canvas size
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = Math.min(800, rect.width - 40);
        this.canvas.height = Math.min(600, rect.height - 40);

        // Set initial canvas background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    createInitialLayer() {
        const layer = {
            id: 'layer_' + Date.now(),
            name: 'Background',
            visible: true,
            opacity: 1,
            data: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
            locked: false
        };
        this.layers.push(layer);
        this.activeLayerId = layer.id;
    }

    setupEventListeners() {
        // Canvas drawing events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectTool(btn.dataset.tool);
            });
        });

        // Tool settings
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.currentSize = e.target.value;
        });

        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });

        document.getElementById('opacity').addEventListener('input', (e) => {
            this.currentOpacity = e.target.value / 100;
        });

        // Layer management
        document.getElementById('addLayerBtn').addEventListener('click', () => {
            this.addLayer();
        });

        // Canvas controls
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('fitCanvas').addEventListener('click', () => {
            this.fitCanvas();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveCanvas();
        });

        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareCanvas();
        });

        // AI Assistant
        document.getElementById('aiCompleteBtn').addEventListener('click', () => {
            this.aiCompleteSketch();
        });

        document.getElementById('aiStyleBtn').addEventListener('click', () => {
            this.aiStyleTransfer();
        });

        // Authentication
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.showLoginModal();
        });

        document.getElementById('googleLoginBtn').addEventListener('click', () => {
            this.oauthLogin('google');
        });

        document.getElementById('githubLoginBtn').addEventListener('click', () => {
            this.oauthLogin('github');
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => {
            this.hideLoginModal();
        });

        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            this.copyShareLink();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    setupWebSocket() {
        // Initialize WebSocket connection (placeholder for real implementation)
        // In production, this would connect to your Socket.IO server
        console.log('WebSocket connection initialized');

        // Simulate connection
        setTimeout(() => {
            this.onSocketConnect();
        }, 1000);
    }

    onSocketConnect() {
        console.log('Connected to WebSocket server');
        // Join canvas room
        if (this.socket) {
            this.socket.emit('join-canvas', { canvasId: this.canvasId });
        }
    }

    selectTool(tool) {
        this.currentTool = tool;

        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');

        // Update cursor
        switch (tool) {
            case 'brush':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                this.canvas.style.cursor = 'grab';
                break;
            case 'fill':
                this.canvas.style.cursor = 'pointer';
                break;
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
        }
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom - this.panX;
        const y = (e.clientY - rect.top) / this.zoom - this.panY;

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);

        // Broadcast stroke start
        this.broadcastStroke('start', { x, y });
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom - this.panX;
        const y = (e.clientY - rect.top) / this.zoom - this.panY;

        this.ctx.globalAlpha = this.currentOpacity;
        this.ctx.lineWidth = this.currentSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        switch (this.currentTool) {
            case 'brush':
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentColor;
                break;
            case 'eraser':
                this.ctx.globalCompositeOperation = 'destination-out';
                break;
            default:
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentColor;
        }

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);

        // Broadcast stroke continue
        this.broadcastStroke('continue', { x, y });
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.beginPath();

            // Update layer data
            this.updateActiveLayer();

            // Broadcast stroke end
            this.broadcastStroke('end', {});
        }
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' :
                                         e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    broadcastStroke(type, data) {
        // Broadcast stroke data to connected users
        if (this.socket) {
            this.socket.emit('stroke', {
                type,
                data: {
                    ...data,
                    tool: this.currentTool,
                    color: this.currentColor,
                    size: this.currentSize,
                    opacity: this.currentOpacity,
                    layerId: this.activeLayerId,
                    timestamp: Date.now()
                }
            });
        }
    }

    addLayer() {
        const layer = {
            id: 'layer_' + Date.now(),
            name: `Layer ${this.layers.length + 1}`,
            visible: true,
            opacity: 1,
            data: this.ctx.createImageData(this.canvas.width, this.canvas.height),
            locked: false
        };
        this.layers.push(layer);
        this.activeLayerId = layer.id;
        this.updateLayersUI();
    }

    updateActiveLayer() {
        const activeLayer = this.layers.find(l => l.id === this.activeLayerId);
        if (activeLayer) {
            activeLayer.data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    updateLayersUI() {
        const layersList = document.getElementById('layersList');
        layersList.innerHTML = '';

        this.layers.slice().reverse().forEach(layer => {
            const layerItem = document.createElement('div');
            layerItem.className = `layer-item ${layer.id === this.activeLayerId ? 'active' : ''}`;
            layerItem.innerHTML = `
                <span>${layer.name}</span>
                <div class="layer-controls">
                    <button onclick="aiCanvas.toggleLayerVisibility('${layer.id}')">${layer.visible ? '👁️' : '👁️‍🗨️'}</button>
                    <button onclick="aiCanvas.toggleLayerLock('${layer.id}')">${layer.locked ? '🔒' : '🔓'}</button>
                </div>
            `;
            layerItem.addEventListener('click', () => {
                this.selectLayer(layer.id);
            });
            layersList.appendChild(layerItem);
        });
    }

    selectLayer(layerId) {
        this.activeLayerId = layerId;
        this.updateLayersUI();
    }

    toggleLayerVisibility(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.visible = !layer.visible;
            this.updateLayersUI();
            this.redrawCanvas();
        }
    }

    toggleLayerLock(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.locked = !layer.locked;
            this.updateLayersUI();
        }
    }

    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Redraw visible layers
        this.layers.filter(layer => layer.visible).forEach(layer => {
            this.ctx.putImageData(layer.data, 0, 0);
        });
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 5);
        this.applyTransform();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.2);
        this.applyTransform();
    }

    fitCanvas() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
    }

    applyTransform() {
        this.canvas.style.transform = `scale(${this.zoom}) translate(${this.panX}px, ${this.panY}px)`;
    }

    saveCanvas() {
        // Create download link
        const link = document.createElement('a');
        link.download = `ai-canvas-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();

        // Show save confirmation
        this.showNotification('Canvas saved successfully!');
    }

    shareCanvas() {
        const shareUrl = `${window.location.origin}${window.location.pathname}?canvas=${this.canvasId}`;
        document.getElementById('shareLink').value = shareUrl;
        this.showNotification('Share link generated!');
    }

    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        shareLink.select();
        document.execCommand('copy');
        this.showNotification('Share link copied to clipboard!');
    }

    async aiCompleteSketch() {
        this.showLoading(true);

        try {
            // Simulate AI completion
            await new Promise(resolve => setTimeout(resolve, 2000));

            // In production, this would call your AI service
            const imageData = this.canvas.toDataURL();
            console.log('AI sketch completion with data:', imageData);

            this.showNotification('AI completed your sketch!');
        } catch (error) {
            console.error('AI completion failed:', error);
            this.showNotification('AI completion failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async aiStyleTransfer() {
        const style = document.getElementById('styleSelect').value;
        this.showLoading(true);

        try {
            // Simulate AI style transfer
            await new Promise(resolve => setTimeout(resolve, 3000));

            // In production, this would call your AI service
            const imageData = this.canvas.toDataURL();
            console.log('AI style transfer with style:', style, imageData);

            this.showNotification(`Applied ${style} style to your canvas!`);
        } catch (error) {
            console.error('AI style transfer failed:', error);
            this.showNotification('AI style transfer failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
    }

    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
    }

    oauthLogin(provider) {
        // Simulate OAuth login
        this.showLoading(true);

        setTimeout(() => {
            this.currentUser = {
                id: 'user_' + Date.now(),
                name: `Demo User (${provider})`,
                email: `demo@${provider}.com`,
                avatar: '👤'
            };

            this.hideLoginModal();
            this.updateAuthUI();
            this.showNotification(`Successfully logged in with ${provider}!`);
            this.showLoading(false);
        }, 1500);
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const profileBtn = document.getElementById('profileBtn');

        if (this.currentUser) {
            loginBtn.style.display = 'none';
            profileBtn.style.display = 'block';
            profileBtn.textContent = this.currentUser.name;
        } else {
            loginBtn.style.display = 'block';
            profileBtn.style.display = 'none';
        }
    }

    showLoading(show) {
        const loader = document.getElementById('loadingIndicator');
        loader.style.display = show ? 'block' : 'none';
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#dc3545'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    handleResize() {
        // Handle canvas resize
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // Save current canvas content
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Resize canvas
        this.canvas.width = Math.min(800, rect.width - 40);
        this.canvas.height = Math.min(600, rect.height - 40);

        // Restore canvas content
        this.ctx.putImageData(imageData, 0, 0);
    }

    updateUI() {
        this.updateLayersUI();
        this.updateAuthUI();

        // Set initial tool
        this.selectTool('brush');

        // Update canvas title
        document.getElementById('canvasTitle').textContent = 'Untitled Canvas';

        // Generate initial share link
        this.shareCanvas();

        // Load gallery items (placeholder)
        this.loadGallery();
    }

    loadGallery() {
        const galleryItems = document.getElementById('galleryItems');
        galleryItems.innerHTML = '';

        // Add placeholder gallery items
        for (let i = 1; i <= 4; i++) {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.style.background = `linear-gradient(135deg, #667eea, #764ba2)`;
            item.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 2rem;">🎨</div>`;
            item.addEventListener('click', () => {
                this.showNotification('Gallery feature coming soon!');
            });
            galleryItems.appendChild(item);
        }
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the application
let aiCanvas;
document.addEventListener('DOMContentLoaded', () => {
    aiCanvas = new AICanvas();
    console.log('AI Canvas initialized successfully!');
});

// Handle canvas sharing via URL parameters
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedCanvasId = urlParams.get('canvas');

    if (sharedCanvasId && aiCanvas) {
        aiCanvas.showNotification('Joining shared canvas...');
        // In production, this would load the shared canvas
        console.log('Loading shared canvas:', sharedCanvasId);
    }
});
