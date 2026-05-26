const COINS = [
  { sym:'BTC', name:'Bitcoin',  icon:'₿', color:'#F7931A', price:'₹68,42,500', change:'+2.14%', up:true,  holdings:'0.04231', inr:'₹2,89,350', pct: 67 },
  { sym:'ETH', name:'Ethereum', icon:'Ξ', color:'#627EEA', price:'₹3,50,800',  change:'-0.87%', up:false, holdings:'1.842',   inr:'₹64,570',   pct: 15 },
  { sym:'SOL', name:'Solana',   icon:'◎', color:'#9945FF', price:'₹14,200',    change:'+4.21%', up:true,  holdings:'12.5',    inr:'₹17,750',   pct: 4  },
  { sym:'BNB', name:'BNB',      icon:'B', color:'#F0B90B', price:'₹48,900',    change:'+1.05%', up:true,  holdings:'0.8',     inr:'₹39,120',   pct: 9  },
  { sym:'ADA', name:'Cardano',  icon:'₳', color:'#0033AD', price:'₹42',        change:'-2.30%', up:false, holdings:'1200',    inr:'₹50,400',   pct: 12 },
]

export default function PortfolioPage() {
  return (
    <>
      <div className="dash-header">
        <h1 className="dash-header-title">Portfolio</h1>
        <div className="dash-header-right">
          <div className="header-badge">Total: ₹4,28,750</div>
        </div>
      </div>

      <div className="dash-content">
        <div className="grid-3 mb-3">
          {[
            { label:'Total Value', value:'₹4,28,750', sub:'▲ +2.96% today',     color:'var(--accent-green)' },
            { label:'INR Balance', value:'₹82,500',   sub:'Available',           color:'var(--text-muted)'   },
            { label:'Best Performer',value:'SOL +4.21%',sub:'12.5 SOL held',    color:'var(--accent-green)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize:22 }}>{s.value}</div>
              <div className="stat-change" style={{ color: s.color }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="card mb-3">
          <div className="section-title">Allocation</div>
          <div style={{ display:'flex', gap:0, height:12, borderRadius:8, overflow:'hidden', marginBottom:'1rem' }}>
            {COINS.map(c => (
              <div key={c.sym} style={{ width:`${c.pct}%`, background:c.color, transition:'width 0.5s' }} title={`${c.sym}: ${c.pct}%`} />
            ))}
          </div>
          <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
            {COINS.map(c => (
              <div key={c.sym} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:c.color }} />
                <span style={{ color:'var(--text-muted)' }}>{c.sym}</span>
                <span style={{ fontWeight:600 }}>{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Holdings</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Coin</th>
                <th>Price</th>
                <th>Holdings</th>
                <th>Value (INR)</th>
                <th>Allocation</th>
                <th>24h</th>
              </tr>
            </thead>
            <tbody>
              {COINS.map(c => (
                <tr key={c.sym}>
                  <td>
                    <div className="coin-cell">
                      <div className="coin-icon" style={{ background:c.color+'22', color:c.color }}>{c.icon}</div>
                      <div>
                        <div className="coin-name">{c.name}</div>
                        <div className="coin-sym">{c.sym}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily:'var(--mono)' }}>{c.price}</td>
                  <td style={{ fontFamily:'var(--mono)' }}>{c.holdings} {c.sym}</td>
                  <td style={{ fontFamily:'var(--mono)', fontWeight:600 }}>{c.inr}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:4, background:'var(--border)', borderRadius:4 }}>
                        <div style={{ width:`${c.pct}%`, height:'100%', background:c.color, borderRadius:4 }} />
                      </div>
                      <span style={{ fontSize:11, color:'var(--text-muted)', width:30 }}>{c.pct}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${c.up ? 'badge-green':'badge-red'}`}>
                      {c.up ? '▲':'▼'} {c.change}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}