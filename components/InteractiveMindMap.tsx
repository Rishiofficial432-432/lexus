import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, ZoomIn, ZoomOut, RotateCcw, BrainCircuit, X, Plus, Loader } from 'lucide-react';
import { geminiAI } from './gemini';

// Helper function for text wrapping
function wrapText(text: string, maxWidthChars: number): string[] {
    const words = text.split(' ');
    // Handle single long words by splitting them
    if (words.length === 1 && text.length > maxWidthChars) {
        const chunks = [];
        for (let i = 0; i < text.length; i += maxWidthChars) {
            chunks.push(text.substring(i, i + maxWidthChars));
        }
        return chunks;
    }

    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
        if ((currentLine + ' ' + word).trim().length > maxWidthChars && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = currentLine ? currentLine + ' ' + word : word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

// Reusable dimension calculator
const calculateNodeDimensions = (text: string): { width: number; height: number; lines: string[] } => {
    const lineHeight = 18;
    const padding = { x: 16, y: 12 };

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '-9999px';
    svg.style.left = '-9999px';
    document.body.appendChild(svg);
    
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.setAttribute('font-size', '14px');
    textElement.setAttribute('font-weight', '500');
    svg.appendChild(textElement);

    const lines = wrapText(text, 25);
    
    let maxWidth = 0;
    lines.forEach(line => {
        textElement.textContent = line;
        const bbox = textElement.getBBox();
        if (bbox.width > maxWidth) {
            maxWidth = bbox.width;
        }
    });

    document.body.removeChild(svg);

    const width = maxWidth + padding.x * 2;
    const height = lines.length * lineHeight + padding.y * 2;
    
    return { width, height, lines };
};


// Type Definitions
interface MindMapNodeData {
  id: number;
  text: string;
  x: number;
  y: number;
  level: number;
  color: string;
  parentId?: number;
  width: number;
  height: number;
  lines: string[];
}

interface MindMapConnection {
  from: number;
  to: number;
}

interface MindMapData {
  nodes: MindMapNodeData[];
  connections: MindMapConnection[];
  title: string;
}

const generateMindMap = (content: string, title: string): MindMapData => {
    const allLines = content.split('\n').filter(line => line.trim() !== '');
    
    const rootText = allLines.length > 0 
        ? allLines.shift()!.trim().replace(/^[*-]\s*/, '') 
        : title.replace(/\.[^/.]+$/, "");
    
    const lines = allLines;

    const nodes: MindMapNodeData[] = [];
    const connections: MindMapConnection[] = [];
    let idCounter = 0;
    
    const rootNode: Omit<MindMapNodeData, 'width' | 'height' | 'lines'> = {
        id: idCounter++,
        text: rootText,
        x: 0,
        y: 0,
        level: 0,
        color: 'hsl(var(--primary))',
    };
    nodes.push(rootNode as MindMapNodeData);
    
    const parentStack: MindMapNodeData[] = [rootNode as MindMapNodeData];

    lines.forEach(line => {
        const indent = line.search(/\S|$/);
        const level = Math.floor(indent / 2) + 1;
        const text = line.trim().replace(/^[*-]\s*/, '');

        if (!text) return;

        while (level < parentStack.length) {
            parentStack.pop();
        }
        const parent = parentStack[parentStack.length - 1];
        
        const color = level === 1 ? 'hsl(var(--secondary))' : 'hsl(var(--muted))';

        const newNode: Omit<MindMapNodeData, 'width' | 'height' | 'lines'> = {
            id: idCounter++,
            text,
            x: 0,
            y: 0,
            level,
            color,
            parentId: parent.id,
        };
        nodes.push(newNode as MindMapNodeData);
        connections.push({ from: parent.id, to: newNode.id });
        parentStack.push(newNode as MindMapNodeData);
    });

    nodes.forEach(node => {
        const { width, height, lines } = calculateNodeDimensions(node.text);
        Object.assign(node, { width, height, lines });
    });

    const childrenMap = new Map<number, MindMapNodeData[]>();
    nodes.forEach(node => {
        if (node.parentId !== undefined) {
            if (!childrenMap.has(node.parentId)) childrenMap.set(node.parentId, []);
            childrenMap.get(node.parentId)!.push(node);
        }
    });

    const subtreeAngles = new Map<number, number>();
    const minAngle = 0.2; 

    function calculateSubtreeAngle(nodeId: number): number {
        if (subtreeAngles.has(nodeId)) return subtreeAngles.get(nodeId)!;
        const children = childrenMap.get(nodeId) || [];
        if (children.length === 0) {
            const node = nodes.find(n => n.id === nodeId)!;
            const angle = Math.max(minAngle, (node.width / 250));
            subtreeAngles.set(nodeId, angle);
            return angle;
        }

        let totalAngle = children.reduce((sum, child) => sum + calculateSubtreeAngle(child.id), 0);
        totalAngle += (children.length - 1) * 0.05;
        subtreeAngles.set(nodeId, totalAngle);
        return totalAngle;
    }

    calculateSubtreeAngle(0);

    function positionNodesRecursive(nodeId: number, startAngle: number, endAngle: number) {
        const children = childrenMap.get(nodeId) || [];
        if (children.length === 0) return;
        const parentNode = nodes.find(n => n.id === nodeId)!;
        const totalSubtreeAngle = Math.max(subtreeAngles.get(nodeId)!, 0.1);
        const availableAngle = endAngle - startAngle;
        let currentAngle = startAngle;

        for (const child of children) {
            const childSubtreeAngle = subtreeAngles.get(child.id)!;
            const angleSlice = (childSubtreeAngle / totalSubtreeAngle) * availableAngle;
            const angle = currentAngle + angleSlice / 2;
            const radius = (parentNode.level * 120) + Math.max(parentNode.width, parentNode.height) / 2 + Math.max(child.width, child.height) / 2 + 50;
            child.x = parentNode.x + Math.cos(angle) * radius;
            child.y = parentNode.y + Math.sin(angle) * radius;
            positionNodesRecursive(child.id, currentAngle, currentAngle + angleSlice);
            currentAngle += angleSlice;
        }
    }

    const rootNodeLayout = nodes.find(n => n.id === 0)!;
    rootNodeLayout.x = 0;
    rootNodeLayout.y = 0;
    const rootTotalAngle = subtreeAngles.get(0) || 2 * Math.PI;
    const totalAngleForRoot = Math.max(rootTotalAngle, 2 * Math.PI);
    positionNodesRecursive(0, 0, totalAngleForRoot);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        minX = Math.min(minX, node.x - node.width / 2);
        maxX = Math.max(maxX, node.x + node.width / 2);
        minY = Math.min(minY, node.y - node.height / 2);
        maxY = Math.max(maxY, node.y + node.height / 2);
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    nodes.forEach(node => {
        node.x -= centerX;
        node.y -= centerY;
    });

    return { nodes, connections, title };
};

const simulatePDFExtraction = async (file: File): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `PDF Document Analysis: ${file.name}
- Business Strategy
  - Market Analysis
    - Competitive landscape
    - Market size and trends
    - Customer segments
  - Financial Planning
    - Revenue projections
    - Cost analysis
    - ROI calculations
- Implementation Strategy
  - Timeline and milestones
  - Resource allocation
  - Risk assessment
`;
};

const simulateWordExtraction = async (file: File): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    return `Word Document Content: ${file.name}
- Project Overview: Software Development
  - Requirements Analysis
    - Functional requirements
    - Non-functional requirements
  - System Design
    - Architecture overview
    - Database design
  - Development Process
    - Technology stack
    - Quality assurance
`;
};

const simulatePPTExtraction = async (file: File): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1800));
    return `Presentation Summary: ${file.name}
- Marketing Campaign Strategy
  - Target Audience
    - Demographics analysis
    - Psychographics profile
  - Campaign Objectives
    - Brand awareness goals
    - Lead generation targets
  - Channel Strategy
    - Digital marketing channels
    - Social media platforms
`;
};


// Main Component
const InteractiveMindMap: React.FC = () => {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, width: 800, height: 600 });
  
  const [selectedNode, setSelectedNode] = useState<MindMapNodeData | null>(null);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  
  const [draggingNode, setDraggingNode] = useState<{ id: number; offset: { x: number; y: number } } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [tempNodeText, setTempNodeText] = useState('');

  const svgRef = useRef<SVGSVGElement>(null);

  const resetView = () => {
    setZoom(1);
    const initialViewBox = { x: -400, y: -300, width: 800, height: 600 };
    setViewBox(initialViewBox);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setMindMapData(null);
    setSelectedNode(null);
    setExplanation('');
    setDocumentFile(file);

    try {
      let content = '';
      const fileName = file.name.toLowerCase();

      if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
          content = await simulatePDFExtraction(file);
      } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword' ||
          fileName.endsWith('.docx') ||
          fileName.endsWith('.doc')
      ) {
          content = await simulateWordExtraction(file);
      } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
          file.type === 'application/vnd.ms-powerpoint' ||
          fileName.endsWith('.pptx') ||
          fileName.endsWith('.ppt')
      ) {
          content = await simulatePPTExtraction(file);
      } else {
          content = await file.text();
      }

      const mindMap = generateMindMap(content, file.name);
      setMindMapData(mindMap);
      resetView();
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. The format may not be fully supported.');
    } finally {
        setIsProcessing(false);
    }
  };

    const handleNodeClick = async (node: MindMapNodeData) => {
        if (selectedNode?.id === node.id) {
            setSelectedNode(null);
            setExplanation('');
            return;
        }
        if (editingNodeId) return;

        setSelectedNode(node);
        setExplanation('');
        setIsExplaining(true);
        
        if (!geminiAI) {
            setExplanation("AI features are disabled. API key not found.");
            setIsExplaining(false);
            return;
        }

        try {
            const context = mindMapData?.nodes
                .filter(n => n.parentId === node.parentId || n.id === node.parentId || n.parentId === node.id)
                .map(n => n.text)
                .join(', ');
            
            const prompt = `In the context of a mind map about "${mindMapData?.title}", briefly explain the concept of "${node.text}". Related concepts include: ${context}. Keep the explanation to 2-3 sentences.`;
            
            const response = await geminiAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const responseText = response.text.trim();
            setExplanation(responseText);
        } catch (err) {
            console.error("Failed to get explanation:", err);
            setExplanation("Sorry, I couldn't generate an explanation for this topic.");
        } finally {
            setIsExplaining(false);
        }
    };

    const handleNodeDoubleClick = (node: MindMapNodeData) => {
        setEditingNodeId(node.id);
        setTempNodeText(node.text);
        setSelectedNode(null); // Deselect to hide sidebar during editing
    };

    const handleNodeTextSave = () => {
        if (editingNodeId === null) return;
        const originalNode = mindMapData?.nodes.find(n => n.id === editingNodeId);

        setMindMapData(prev => {
            if (!prev) return null;
            const newText = tempNodeText.trim();
            if (!newText || newText === originalNode?.text) return prev;

            const { width, height, lines } = calculateNodeDimensions(newText);

            return {
                ...prev,
                nodes: prev.nodes.map(n => 
                    n.id === editingNodeId 
                    ? { ...n, text: newText, width, height, lines } 
                    : n
                )
            };
        });
        setEditingNodeId(null);
    };

    const handleAddNode = () => {
        if (!selectedNode || !mindMapData) return;
        const parentNode = selectedNode;
        const newId = Math.max(...mindMapData.nodes.map(n => n.id)) + 1;
        const text = 'New Idea';
        const { width, height, lines } = calculateNodeDimensions(text);
        
        const angle = Math.random() * 2 * Math.PI;
        const radius = 100 + parentNode.width / 2;
        const x = parentNode.x + Math.cos(angle) * radius;
        const y = parentNode.y + Math.sin(angle) * radius;

        const newNode: MindMapNodeData = {
            id: newId, text, x, y, level: parentNode.level + 1, color: 'hsl(var(--muted))',
            parentId: parentNode.id, width, height, lines
        };
        const newConnection: MindMapConnection = { from: parentNode.id, to: newId };
        
        setMindMapData(prev => ({
            ...prev!,
            nodes: [...prev!.nodes, newNode],
            connections: [...prev!.connections, newConnection]
        }));
        setSelectedNode(newNode);
    };

    const handleColorChange = (color: string) => {
        if (!selectedNode || !mindMapData) return;
        
        const updatedNode = { ...selectedNode, color };
        setMindMapData(prev => ({
            ...prev!,
            nodes: prev!.nodes.map(n => n.id === selectedNode.id ? updatedNode : n)
        }));
        setSelectedNode(updatedNode);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
        setZoom(Math.max(0.1, Math.min(5, newZoom)));
    };

    const handleNodeMouseDown = (e: React.MouseEvent, node: MindMapNodeData) => {
        e.stopPropagation();
        if (svgRef.current) {
            const CTM = svgRef.current.getScreenCTM();
            if (CTM) {
                const svgPoint = svgRef.current.createSVGPoint();
                svgPoint.x = e.clientX;
                svgPoint.y = e.clientY;
                const transformedPoint = svgPoint.matrixTransform(CTM.inverse());
                setDraggingNode({ id: node.id, offset: { x: node.x - transformedPoint.x, y: node.y - transformedPoint.y } });
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (e.target === svgRef.current && editingNodeId === null) {
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (draggingNode && svgRef.current) {
            e.preventDefault();
            const CTM = svgRef.current.getScreenCTM();
            if (CTM) {
                const svgPoint = svgRef.current.createSVGPoint();
                svgPoint.x = e.clientX;
                svgPoint.y = e.clientY;
                const transformedPoint = svgPoint.matrixTransform(CTM.inverse());
                
                setMindMapData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        nodes: prev.nodes.map(n =>
                            n.id === draggingNode.id
                                ? { ...n, x: transformedPoint.x + draggingNode.offset.x, y: transformedPoint.y + draggingNode.offset.y }
                                : n
                        ),
                    };
                });
            }
        } else if (isPanning) {
            const dx = (e.clientX - panStart.x) / zoom;
            const dy = (e.clientY - panStart.y) / zoom;
            setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
            setPanStart({ x: e.clientX, y: e.clientY });
        }
    };
    
    const handleMouseUp = () => {
        setIsPanning(false);
        setDraggingNode(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-accent/20 text-foreground relative overflow-hidden">
            <header className="p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0 z-10">
                <h1 className="text-xl font-bold flex items-center gap-3"><BrainCircuit /> VisualMind Explorer</h1>
                <div className="flex items-center gap-2">
                    <input type="file" id="doc-upload" className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.md,.docx,.doc,.pptx,.ppt" />
                    <label htmlFor="doc-upload" className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer">
                        <Upload size={16} /> Upload Document
                    </label>
                </div>
            </header>
    
            <main className="flex-1 flex relative">
                {isProcessing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-20">
                        <Loader className="w-12 h-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-semibold">Analyzing Document...</p>
                        <p className="text-muted-foreground">{documentFile?.name}</p>
                    </div>
                ) : !mindMapData ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <FileText size={48} className="text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold">Visualize Your Knowledge</h2>
                        <p className="text-muted-foreground mt-2 max-w-md">Upload a document (.txt, .pdf, .docx) to automatically generate an interactive mind map of its contents.</p>
                    </div>
                ) : (
                    <>
                        <svg
                            ref={svgRef}
                            className="flex-1 w-full h-full cursor-grab active:cursor-grabbing"
                            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / zoom} ${viewBox.height / zoom}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onWheel={handleWheel}
                        >
                            <g>
                                {mindMapData.connections.map(conn => {
                                    const fromNode = mindMapData.nodes.find(n => n.id === conn.from);
                                    const toNode = mindMapData.nodes.find(n => n.id === conn.to);
                                    if (!fromNode || !toNode) return null;
                                    const path = `M ${fromNode.x} ${fromNode.y} Q ${fromNode.x} ${toNode.y}, ${toNode.x} ${toNode.y}`;
                                    return <path key={`${conn.from}-${conn.to}`} d={path} stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />;
                                })}
                            </g>
                            <g>
                                {mindMapData.nodes.map(node => (
                                    <g
                                        key={node.id}
                                        transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
                                        onClick={() => handleNodeClick(node)}
                                        onDoubleClick={() => handleNodeDoubleClick(node)}
                                        onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                        className="cursor-pointer"
                                    >
                                        <rect
                                            width={node.width}
                                            height={node.height}
                                            rx="8"
                                            fill={node.color}
                                            stroke={selectedNode?.id === node.id ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                                            strokeWidth={selectedNode?.id === node.id ? 2 : 1.5}
                                        />
                                        {editingNodeId === node.id ? (
                                            <foreignObject x="4" y="4" width={node.width - 8} height={node.height - 8}>
                                                <input
                                                    type="text"
                                                    value={tempNodeText}
                                                    onChange={e => setTempNodeText(e.target.value)}
                                                    onBlur={handleNodeTextSave}
                                                    onKeyDown={e => e.key === 'Enter' && handleNodeTextSave()}
                                                    autoFocus
                                                    style={{
                                                        width: '100%', height: '100%',
                                                        border: 'none', background: 'transparent',
                                                        textAlign: 'center', color: 'hsl(var(--primary-foreground))',
                                                        outline: 'none', fontSize: '14px',
                                                    }}
                                                    onClick={e => e.stopPropagation()} // Prevent node click
                                                />
                                            </foreignObject>
                                        ) : (
                                            node.lines.map((line, i) => (
                                                <text
                                                    key={i}
                                                    x={node.width / 2}
                                                    y={12 + (i + 0.5) * 18}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill={node.level === 0 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
                                                    fontSize="14"
                                                    fontWeight="500"
                                                    style={{ pointerEvents: 'none' }}
                                                >
                                                    {line}
                                                </text>
                                            ))
                                        )}
                                    </g>
                                ))}
                            </g>
                        </svg>
    
                        {/* Controls */}
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="p-2 bg-card rounded-md border border-border shadow-md hover:bg-secondary"><ZoomIn size={18} /></button>
                            <button onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} className="p-2 bg-card rounded-md border border-border shadow-md hover:bg-secondary"><ZoomOut size={18} /></button>
                            <button onClick={resetView} className="p-2 bg-card rounded-md border border-border shadow-md hover:bg-secondary"><RotateCcw size={18} /></button>
                        </div>
                    </>
                )}
    
                {/* Explanation Sidebar */}
                {selectedNode && (
                    <aside className="absolute top-0 right-0 h-full w-80 bg-card/80 backdrop-blur-sm border-l border-border/50 flex flex-col p-4 animate-slide-in-from-right">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Node Details</h3>
                            <button onClick={() => setSelectedNode(null)} className="p-1 rounded-md hover:bg-secondary"><X size={18} /></button>
                        </div>
                        <div className="overflow-y-auto">
                            <p className="font-semibold text-primary mb-2">{selectedNode.text}</p>
    
                            <h4 className="font-semibold text-muted-foreground mt-4 mb-2 text-sm">AI Explanation</h4>
                            {isExplaining ? (
                                <div className="flex items-center gap-2 text-muted-foreground"><Loader className="w-4 h-4 animate-spin"/> Generating...</div>
                            ) : (
                                <p className="text-sm text-foreground/90">{explanation || "Click 'Explain' to get an AI-powered summary."}</p>
                            )}
    
                            <h4 className="font-semibold text-muted-foreground mt-4 mb-2 text-sm">Actions</h4>
                            <div className="space-y-2">
                                <button onClick={handleAddNode} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary rounded-md hover:bg-secondary/80">
                                    <Plus size={16} /> Add Child Node
                                </button>
                                 <div className="grid grid-cols-5 gap-2 pt-2">
                                    {['hsl(var(--primary))', 'hsl(var(--secondary))', '#4ade80', '#facc15', '#fb923c'].map(color => (
                                        <button key={color} onClick={() => handleColorChange(color)} className="w-full h-8 rounded-md" style={{ backgroundColor: color }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </main>
        </div>
    );
};

export default InteractiveMindMap;
