import './Sidebar.css';

const TOOLS = [
  {
    group: 'Organize',
    items: [
      { id: 'merge', icon: '⊕', label: 'Merge PDF', badge: null },
      { id: 'split', icon: '⊘', label: 'Split PDF', badge: null },
      { id: 'rotate', icon: '↻', label: 'Rotate Pages', badge: null },
    ],
  },
  {
    group: 'Convert',
    items: [
      { id: 'pdfToImage', icon: '◫', label: 'PDF → Image', badge: 'JPG/PNG' },
      { id: 'imageToPDF', icon: '◩', label: 'Image → PDF', badge: null },
    ],
  },
  {
    group: 'Optimize',
    items: [
      { id: 'compress', icon: '◈', label: 'Compress', badge: null },
      { id: 'watermark', icon: '◎', label: 'Watermark', badge: null },

    ],
  },
  {
    group: 'Extract',
    items: [
      { id: 'extractText', icon: '≡', label: 'Extract Text', badge: null },
      { id: 'ocr', icon: '⊡', label: 'OCR Scan', badge: 'AI' },
    ],
  },
];

export default function Sidebar({ activeTool, onSelect }) {
  return (
    <aside className="sidebar glass">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">⬡</div>
        <div>
          <div className="logo-title">PDF<span>KIT</span></div>
          <div className="logo-sub">v1.0 · Neural Edition</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {TOOLS.map(group => (
          <div key={group.group} className="nav-group">
            <div className="nav-group-label">{group.group}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeTool === item.id ? 'active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="status-dot" />
        <span>System Online</span>
      </div>
    </aside>
  );
}
