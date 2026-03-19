document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('graph');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = 500; // Fixed height
        drawGraph();
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Graph state
    let equations = [];
    let graphState = {
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
        scaleX: 1,
        scaleY: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        lastX: 0,
        lastY: 0
    };
    
    // Color palette for equations
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#d35400', '#34495e', '#c0392b', '#27ae60'
    ];
    
    // Add equation
    document.getElementById('add-equation-btn').addEventListener('click', addEquation);
    document.getElementById('new-equation').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addEquation();
    });
    
    function addEquation() {
        const input = document.getElementById('new-equation');
        const equationText = input.value.trim();
        
        if (equationText) {
            const color = colors[equations.length % colors.length];
            equations.push({
                text: equationText,
                color: color,
                fn: compileEquation(equationText)
            });
            
            input.value = '';
            renderEquationList();
            drawGraph();
        }
    }
    
    // Compile equation text into a function
    function compileEquation(text) {
        // Replace common math notations with JS equivalents
        let js = text
            .replace(/\^/g, '**')  // Convert ^ to ** for exponentiation
            .replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, 'Math.tan(')
            .replace(/sqrt\(/g, 'Math.sqrt(')
            .replace(/abs\(/g, 'Math.abs(')
            .replace(/log\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(');
        
        try {
            // Create a function that takes x and returns y
            return new Function('x', `return ${js};`);
        } catch (e) {
            console.error('Error compiling equation:', e);
            return () => NaN;
        }
    }
    
    // Render equation list
    function renderEquationList() {
        const list = document.getElementById('equation-list');
        list.innerHTML = '';
        
        equations.forEach((eq, index) => {
            const item = document.createElement('div');
            item.className = 'equation-item';
            
            const color = document.createElement('div');
            color.className = 'equation-color';
            color.style.backgroundColor = eq.color;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'equation-input';
            input.value = eq.text;
            input.addEventListener('change', () => {
                equations[index].text = input.value;
                equations[index].fn = compileEquation(input.value);
                drawGraph();
            });
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-equation';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => {
                equations.splice(index, 1);
                renderEquationList();
                drawGraph();
            });
            
            item.appendChild(color);
            item.appendChild(input);
            item.appendChild(removeBtn);
            list.appendChild(item);
        });
    }
    
    // Draw the graph
    function drawGraph() {
        if (!canvas.width || !canvas.height) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale factors
        const pixelWidth = canvas.width;
        const pixelHeight = canvas.height;
        
        const xRange = graphState.xMax - graphState.xMin;
        const yRange = graphState.yMax - graphState.yMin;
        
        const xScale = pixelWidth / xRange;
        const yScale = pixelHeight / yRange;
        
        // Draw axes
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        
        // X axis
        const xAxisY = pixelHeight - (-graphState.yMin / yRange) * pixelHeight;
        if (xAxisY >= 0 && xAxisY <= pixelHeight) {
            ctx.beginPath();
            ctx.moveTo(0, xAxisY);
            ctx.lineTo(pixelWidth, xAxisY);
            ctx.stroke();
        }
        
        // Y axis
        const yAxisX = (-graphState.xMin / xRange) * pixelWidth;
        if (yAxisX >= 0 && yAxisX <= pixelWidth) {
            ctx.beginPath();
            ctx.moveTo(yAxisX, 0);
            ctx.lineTo(yAxisX, pixelHeight);
            ctx.stroke();
        }
        
        // Draw grid lines
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 0.5;
        
        // Vertical grid lines
        const xStep = getStepSize(xRange);
        for (let x = Math.ceil(graphState.xMin / xStep) * xStep; x <= graphState.xMax; x += xStep) {
            if (Math.abs(x) < 0.0001) continue; // Skip zero (already drawn as axis)
            const pixelX = ((x - graphState.xMin) / xRange) * pixelWidth;
            ctx.beginPath();
            ctx.moveTo(pixelX, 0);
            ctx.lineTo(pixelX, pixelHeight);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        const yStep = getStepSize(yRange);
        for (let y = Math.ceil(graphState.yMin / yStep) * yStep; y <= graphState.yMax; y += yStep) {
            if (Math.abs(y) < 0.0001) continue; // Skip zero (already drawn as axis)
            const pixelY = pixelHeight - ((y - graphState.yMin) / yRange) * pixelHeight;
            ctx.beginPath();
            ctx.moveTo(0, pixelY);
            ctx.lineTo(pixelWidth, pixelY);
            ctx.stroke();
        }
        
        // Draw each equation
        equations.forEach(eq => {
            ctx.strokeStyle = eq.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            let isFirstPoint = true;
            
            for (let pixelX = 0; pixelX < pixelWidth; pixelX++) {
                const x = graphState.xMin + (pixelX / pixelWidth) * xRange;
                let y;
                
                try {
                    y = eq.fn(x);
                } catch (e) {
                    y = NaN;
                }
                
                if (isNaN(y)) {
                    isFirstPoint = true;
                    continue;
                }
                
                const pixelY = pixelHeight - ((y - graphState.yMin) / yRange) * pixelHeight;
                
                if (isFirstPoint) {
                    ctx.moveTo(pixelX, pixelY);
                    isFirstPoint = false;
                } else {
                    ctx.lineTo(pixelX, pixelY);
                }
            }
            
            ctx.stroke();
        });
    }
    
    // Helper function to determine step size for grid lines
    function getStepSize(range) {
        const log10 = Math.log10(range);
        const exponent = Math.floor(log10);
        const fraction = log10 - exponent;
        
        let step;
        if (fraction < Math.log10(2)) {
            step = 10 ** exponent;
        } else if (fraction < Math.log10(5)) {
            step = 2 * 10 ** exponent;
        } else {
            step = 5 * 10 ** exponent;
        }
        
        return step;
    }
    
    // Graph controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        zoom(0.8);
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        zoom(1.2);
    });
    
    document.getElementById('reset-view').addEventListener('click', () => {
        graphState.xMin = -10;
        graphState.xMax = 10;
        graphState.yMin = -10;
        graphState.yMax = 10;
        drawGraph();
    });
    
    function zoom(factor) {
        const xCenter = (graphState.xMin + graphState.xMax) / 2;
        const yCenter = (graphState.yMin + graphState.yMax) / 2;
        
        const xRange = (graphState.xMax - graphState.xMin) * factor;
        const yRange = (graphState.yMax - graphState.yMin) * factor;
        
        graphState.xMin = xCenter - xRange / 2;
        graphState.xMax = xCenter + xRange / 2;
        graphState.yMin = yCenter - yRange / 2;
        graphState.yMax = yCenter + yRange / 2;
        
        drawGraph();
    }
    
    // Mouse interactions for panning and zooming
    canvas.addEventListener('mousedown', (e) => {
        graphState.isDragging = true;
        graphState.lastX = e.clientX;
        graphState.lastY = e.clientY;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (graphState.isDragging) {
            const dx = e.clientX - graphState.lastX;
            const dy = e.clientY - graphState.lastY;
            
            const xRange = graphState.xMax - graphState.xMin;
            const yRange = graphState.yMax - graphState.yMin;
            
            graphState.xMin -= dx / canvas.width * xRange;
            graphState.xMax -= dx / canvas.width * xRange;
            graphState.yMin += dy / canvas.height * yRange;
            graphState.yMax += dy / canvas.height * yRange;
            
            graphState.lastX = e.clientX;
            graphState.lastY = e.clientY;
            
            drawGraph();
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        graphState.isDragging = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        graphState.isDragging = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Get mouse position in graph coordinates
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const xRange = graphState.xMax - graphState.xMin;
        const yRange = graphState.yMax - graphState.yMin;
        
        const graphX = graphState.xMin + (mouseX / canvas.width) * xRange;
        const graphY = graphState.yMax - (mouseY / canvas.height) * yRange;
        
        // Determine zoom factor
        const factor = e.deltaY < 0 ? 0.8 : 1.2;
        
        // Apply zoom centered on mouse position
        graphState.xMin = graphX - (graphX - graphState.xMin) * factor;
        graphState.xMax = graphX + (graphState.xMax - graphX) * factor;
        graphState.yMin = graphY - (graphY - graphState.yMin) * factor;
        graphState.yMax = graphY + (graphState.yMax - graphY) * factor;
        
        drawGraph();
    });
    
    // Add some sample equations to start with
    equations = [
        { text: 'sin(x)', color: colors[0], fn: compileEquation('sin(x)') },
        { text: 'x^2', color: colors[1], fn: compileEquation('x^2') },
        { text: 'cos(x)', color: colors[2], fn: compileEquation('cos(x)') }
    ];
    
    renderEquationList();
    drawGraph();
});