import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, Copy, Search, Eye } from 'lucide-react';
import api from '../api.js';
import ReportDetailModal from '../components/ReportDetailModal';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = () => {
    setLoading(true);
    let url = '/reports?limit=200';
    if (statusFilter) url += `&status=${statusFilter}`;
    if (typeFilter) url += `&damage_type=${typeFilter}`;
    api.get(url).then(setReports).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, [statusFilter, typeFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/reports/${id}/status`, { status });
      fetchReports();
    } catch (e) { console.error(e); }
  };

  const openReport = async (r) => {
    try {
      const detail = await api.get(`/reports/${r.id}`);
      setSelectedReport(detail);
    } catch {
      setSelectedReport(r);
    }
  };

  const filtered = reports.filter(r =>
    !search || r.road_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.damage_type?.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <h2>Reports Management</h2>
        <p>Review, approve, reject, or mark duplicate citizen damage reports</p>
      </div>
      <div className="page-content">
        {/* Filters */}
        <div className="card" style={{marginBottom:16}}>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{position:'relative',flex:'1 1 200px'}}>
              <Search size={16} style={{position:'absolute',left:12,top:11,color:'var(--text3)'}} />
              <input className="form-control" style={{paddingLeft:36}} placeholder="Search reports..."
                value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{width:'auto'}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="scheduled">Scheduled</option>
              <option value="repairing">Repairing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className="form-control" style={{width:'auto'}} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="pothole">Pothole</option>
              <option value="crack">Crack</option>
              <option value="alligator_crack">Alligator Crack</option>
              <option value="road_collapse">Road Collapse</option>
            </select>
            <span style={{color:'var(--text3)',fontSize:'0.85rem'}}>{filtered.length} reports</span>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <FileText size={40} />
              <p>No reports found</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Location</th>
                    <th>Damage Type</th>
                    <th>Severity</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => openReport(r)} style={{ cursor: 'pointer' }}>
                      <td style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--text3)'}}>{r.id.slice(0,8)}</td>
                      <td>
                        <div style={{fontWeight:500}}>{r.road_name || 'Unknown'}</div>
                        <div style={{fontSize:'0.75rem',color:'var(--text3)'}}>{r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}</div>
                      </td>
                      <td><span style={{textTransform:'capitalize'}}>{r.damage_type?.replace('_',' ')}</span></td>
                      <td><span className={`badge badge-${r.severity}`}>{r.severity}</span></td>
                      <td><span style={{color:r.priority_score>7?'#ef4444':r.priority_score>4?'#f59e0b':'#10b981',fontWeight:700}}>{r.priority_score?.toFixed(1)}</span></td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                      <td style={{fontSize:'0.8rem',color:'var(--text2)'}}>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{display:'flex',gap:4}} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openReport(r)} title="View Details">
                            <Eye size={14}/>
                          </button>
                          {r.status === 'submitted' && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={()=>updateStatus(r.id,'verified')}
                                title="Approve"><CheckCircle size={14}/></button>
                              <button className="btn btn-danger btn-sm" onClick={()=>updateStatus(r.id,'rejected')}
                                title="Reject"><XCircle size={14}/></button>
                              <button className="btn btn-secondary btn-sm" onClick={()=>updateStatus(r.id,'duplicate')}
                                title="Mark Duplicate"><Copy size={14}/></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusUpdate={(id, status) => { updateStatus(id, status); setSelectedReport(null); }}
        />
      )}
    </>
  );
}
