import React, { useState, useEffect, useMemo } from "react";

// Contexts
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

// Icons
import { 
  ArrowLeft, Search, Edit3, Trash2, Shield, AlertCircle, 
  Lock, Unlock, Mail, Clock, CheckCircle, XCircle, Filter, Download, UserPlus, Users, RefreshCw
} from "lucide-react";

// API
import { userAPI } from "../../services/api";

// Components
import Navbar from "../common/Navbar.jsx";
import UserActionModal from "./UserActionModal";
import UserDetailsModal from "./UserDetailsModal";

const ManageUsersPage = ({ onBack, onNavigate }) => {
  const { user: currentUser, users: allUsersFromContext = [], updateSubUser, removeSubUser, getSubUsers, addSubUser, ALL_FEATURES } = useAuth();
  const { colors, mode } = useTheme();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', allowedFeatures: [] });
  const [addErrors, setAddErrors] = useState({});
  const [allDbUsers, setAllDbUsers] = useState([]);
  const [allDbSubUsers, setAllDbSubUsers] = useState([]);
  const [dbUsersLoading, setDbUsersLoading] = useState(false);

  // Load users on mount
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      if (!currentUser) { setUsers([]); return; }
      // prefer getSubUsers API when available
      if (typeof getSubUsers === 'function') {
        const sub = (await getSubUsers(currentUser.id)) || [];
        // Normalize backend sub-user data to include role/status
        const normalizedSub = sub.map(s => ({
          ...s,
          role: s.role || 'BUSINESS_USER',
          status: s.isActive === false ? 'INACTIVE' : (s.status || 'ACTIVE'),
        }));
        // include the head user record as well
        const self = currentUser ? {
          ...currentUser,
          role: currentUser.role || 'HEAD_USER',
          status: 'ACTIVE',
        } : null;
        setUsers(self ? [self, ...normalizedSub] : normalizedSub);
      } else {
        const allUsers = Array.isArray(allUsersFromContext) ? allUsersFromContext : [];
        const visible = allUsers.filter(u => u.headUserId === currentUser.id || u.id === currentUser.id);
        setUsers(visible);
      }
    } catch (err) {
      setError('Failed to load users: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser, allUsersFromContext]);

  // Load all users and sub-users from MongoDB
  useEffect(() => {
    const loadAllDbUsers = async () => {
      setDbUsersLoading(true);
      try {
        const data = await userAPI.getAllUsers();
        if (data.success) {
          setAllDbUsers(data.users || []);
          setAllDbSubUsers(data.subUsers || []);
        }
      } catch (error) {
        console.error("Failed to load all users:", error);
      } finally {
        setDbUsersLoading(false);
      }
    };
    loadAllDbUsers();
  }, []);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' || u.status === filterStatus;
      const matchRole = filterRole === 'all' || u.role === filterRole;
      return matchSearch && matchStatus && matchRole;
    });
  }, [users, searchTerm, filterStatus, filterRole]);

  // Handle user actions
  const handleUserAction = async (type, userData) => {
    try {
      setError('');
      if (!currentUser) throw new Error('No current user');
      
      // Prevent suspending admin users
      if (type === 'suspend' && userData.role === 'ADMIN') {
        setError('Admin users cannot be suspended.');
        setShowActionModal(false);
        return;
      }
      
      switch (type) {
        case 'activate':
          await updateSubUser?.(userData.id, { status: 'ACTIVE', isActive: true });
          setSuccessMessage(`User ${userData.name} activated successfully`);
          break;
        case 'suspend':
          await updateSubUser?.(userData.id, { status: 'SUSPENDED', isActive: false });
          setSuccessMessage(`User ${userData.name} suspended successfully`);
          break;
        case 'deactivate':
          await updateSubUser?.(userData.id, { status: 'INACTIVE', isActive: false });
          setSuccessMessage(`User ${userData.name} deactivated successfully`);
          break;
        case 'delete':
          await removeSubUser?.(currentUser.id, userData.id);
          setSuccessMessage(`User ${userData.name} removed successfully`);
          break;
        case 'update-role':
          updateSubUser?.(userData.id, { role: userData.newRole });
          setSuccessMessage(`User ${userData.name} role updated successfully`);
          break;
      }

      // Reload users
      await loadUsers();
      setShowActionModal(false);
      setSelectedUser(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Action failed: ' + (err?.message || err));
    }
  };

  // Export users as CSV
  const exportUsersCsv = (list) => {
    const header = ['id','name','email','role','status','createdAt','allowedFeatures','organizationName','parentId','headUserId'];
    const rows = list.map(u => [
      u.id || '',
      u.name || '',
      u.email || '',
      u.role || '',
      u.status || '',
      u.createdAt || '',
      (u.allowedFeatures || []).join('|'),
      u.organizationName || '',
      u.parentId || '',
      u.headUserId || ''
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartads_users_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };



  const getStatusColor = (status) => {
    const hexToRgba = (hex, a = 0.12) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };
    switch (status) {
      case 'ACTIVE':
        return { color: colors.success, backgroundColor: hexToRgba(colors.success, 0.12) };
      case 'SUSPENDED':
        return { color: colors.accent || '#f59e0b', backgroundColor: hexToRgba(colors.accent || '#f59e0b', 0.12) };
      case 'INACTIVE':
        return { color: colors.error, backgroundColor: hexToRgba(colors.error, 0.12) };
      default:
        return { color: colors.text2, backgroundColor: hexToRgba(colors.text2, 0.06) };
    }
  };

  const getRoleColor = (role) => {
    const hexToRgba = (hex, a = 0.12) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };
    switch (role) {
      case 'ADMIN':
        return { color: colors.error, backgroundColor: hexToRgba(colors.error, 0.08) };
      case 'HEAD_USER':
        return { color: colors.secondary, backgroundColor: hexToRgba(colors.secondary, 0.08) };
      case 'BUSINESS_USER':
        return { color: colors.primary, backgroundColor: hexToRgba(colors.primary, 0.08) };
      case 'SUB_USER':
        return { color: colors.accent || '#EC4899', backgroundColor: hexToRgba(colors.accent || '#EC4899', 0.08) };
      default:
        return { color: colors.text2, backgroundColor: hexToRgba(colors.text2, 0.04) };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle size={16} />;
      case 'SUSPENDED':
        return <AlertCircle size={16} />;
      case 'INACTIVE':
        return <XCircle size={16} />;
      default:
        return null;
    }
  };

  if (!currentUser?.isHeadUser && currentUser?.role !== 'User' && currentUser?.role !== 'Admin') {
    return (
      <div style={{ minHeight: '100vh', paddingTop: 120, paddingBottom: 80, backgroundColor: colors.bg1 }}>
        <Navbar onNavigate={() => {}} showAuthButtons={false} />
        <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '80px 24px' }}>
          <AlertCircle size={64} style={{ margin: '0 auto 16px', color: '#ef4444' }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: colors.text1 }}>Access Denied</h2>
          <p style={{ color: colors.text2, marginBottom: 24 }}>Only administrators can access user management</p>
          <button onClick={onBack} style={{ padding: '12px 28px', borderRadius: 12, fontWeight: 700, backgroundColor: colors.primary, color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const cardStyle = {
    background: colors.cardBg,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
  };

  const btnBase = {
    padding: '10px 20px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.3s ease',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.bg2,
    color: colors.primary,
  };

  const actionBtnStyle = (color) => ({
    width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${color}18`, color: color, transition: 'all 0.25s ease',
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg1, fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        .um-row:hover { background: ${colors.bg2} !important; }
        .um-action-btn:hover { transform: scale(1.12); filter: brightness(1.3); }
        .um-input:focus { border-color: ${colors.primary} !important; box-shadow: 0 0 0 3px ${colors.primary}25; }
      `}</style>

      <Navbar onNavigate={onNavigate || onBack || (() => {})} showAuthButtons={false} />

      <div style={{ paddingTop: 100, maxWidth: 1320, margin: '0 auto', padding: '100px 32px 80px' }}>

        {/* Header Card */}
        <div style={{ ...cardStyle, padding: '36px 40px', marginBottom: 28, animation: 'fadeInUp 0.5s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <button onClick={onBack} style={{ ...btnBase, padding: 12, borderRadius: 14, backgroundColor: colors.bg2 }}>
                <ArrowLeft size={22} />
              </button>
              <div>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: colors.text1, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                  Team Management
                </h1>
                <p style={{ fontSize: 14, color: colors.text2, margin: '4px 0 0', opacity: 0.7 }}>
                  Manage users, roles & permissions
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={loadUsers} style={btnBase}>
                Refresh
              </button>
              <button onClick={() => exportUsersCsv(filteredUsers)} style={btnBase}>
                <Download size={15} /> Export
              </button>
              <button onClick={() => setShowAddModal(true)} style={{ ...btnBase, background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: '#fff', border: 'none', padding: '10px 24px', boxShadow: `0 6px 20px ${colors.primary}40` }}>
                <UserPlus size={15} /> Add User
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28, animation: 'fadeInUp 0.6s ease-out' }}>
          {[
            { label: 'Total Users', value: allDbUsers.length + allDbSubUsers.length, color: colors.primary, icon: <Users size={20} /> },
            { label: 'Active', value: allDbUsers.filter(u => u.status === 'ACTIVE' || u.isActive !== false).length + allDbSubUsers.filter(u => u.status === 'ACTIVE').length, color: colors.success, icon: <CheckCircle size={20} /> },
            { label: 'Suspended', value: allDbSubUsers.filter(u => u.status === 'SUSPENDED').length, color: colors.accent || '#f59e0b', icon: <AlertCircle size={20} /> },
            { label: 'Inactive', value: allDbUsers.filter(u => u.isActive === false || u.status === 'INACTIVE').length + allDbSubUsers.filter(u => u.status === 'INACTIVE').length, color: colors.error, icon: <XCircle size={20} /> },
          ].map((stat, i) => (
            <div key={i} style={{ ...cardStyle, padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: colors.text1, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: colors.text2, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ ...cardStyle, padding: '14px 20px', marginBottom: 20, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontWeight: 600, fontSize: 14, borderRadius: 14 }}>
            {error}
          </div>
        )}
        {successMessage && (
          <div style={{ ...cardStyle, padding: '14px 20px', marginBottom: 20, borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', fontWeight: 600, fontSize: 14, borderRadius: 14, animation: 'fadeInUp 0.3s ease-out' }}>
            &#10003; {successMessage}
          </div>
        )}

        {/* Search & Filters */}
        <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 28, animation: 'fadeInUp 0.7s ease-out' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bg2 }}>
              <Search size={18} style={{ color: colors.text2, flexShrink: 0 }} />
              <input
                className="um-input"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: 14, fontWeight: 600, color: colors.text1 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bg2 }}>
              <Filter size={16} style={{ color: colors.text2 }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: colors.text1, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <option value="all" style={{ background: colors.bg2 }}>All Status</option>
                <option value="ACTIVE" style={{ background: colors.bg2 }}>Active</option>
                <option value="SUSPENDED" style={{ background: colors.bg2 }}>Suspended</option>
                <option value="INACTIVE" style={{ background: colors.bg2 }}>Inactive</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bg2 }}>
              <Shield size={16} style={{ color: colors.text2 }} />
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: colors.text1, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <option value="all" style={{ background: colors.bg2 }}>All Roles</option>
                <option value="ADMIN" style={{ background: colors.bg2 }}>Admin</option>
                <option value="HEAD_USER" style={{ background: colors.bg2 }}>Head User</option>
                <option value="BUSINESS_USER" style={{ background: colors.bg2 }}>Business User</option>
                <option value="SUB_USER" style={{ background: colors.bg2 }}>Sub User</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: colors.text2 }}>
              Showing <span style={{ color: colors.primary, fontWeight: 800 }}>{filteredUsers.length}</span> of {users.length}
            </div>
          </div>
        </div>

        {/* Users List */}
        <div style={{ animation: 'fadeInUp 0.8s ease-out' }}>
          {loading ? (
            <div style={{ ...cardStyle, padding: '80px 24px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: colors.text2, fontWeight: 600, fontSize: 15 }}>Loading users...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ ...cardStyle, padding: '80px 24px', textAlign: 'center' }}>
              <AlertCircle size={48} style={{ margin: '0 auto 16px', color: colors.text2, opacity: 0.3 }} />
              <p style={{ color: colors.text2, fontWeight: 600, fontSize: 16, margin: 0 }}>No users found</p>
              <p style={{ color: colors.text2, fontSize: 13, opacity: 0.5, marginTop: 4 }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.2fr 1.2fr 1.2fr 1fr', padding: '14px 28px', borderBottom: `1px solid ${colors.border}`, background: colors.bg2 }}>
                {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.text2, opacity: 0.6, textAlign: h === 'Actions' ? 'center' : 'left' }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Table Rows */}
              {filteredUsers.map((u, idx) => (
                <div
                  key={u.id}
                  className="um-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2.5fr 1.2fr 1.2fr 1.2fr 1fr',
                    padding: '16px 28px',
                    alignItems: 'center',
                    borderBottom: idx < filteredUsers.length - 1 ? `1px solid ${colors.border}` : 'none',
                    transition: 'background 0.2s ease',
                    cursor: 'pointer',
                    animation: `fadeInUp 0.4s ease-out ${idx * 0.04}s backwards`,
                  }}
                  onClick={() => { setSelectedUser(u); setShowDetailsModal(true); }}
                >
                  {/* User */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: colors.primary, flexShrink: 0 }}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: colors.text1, lineHeight: 1.3 }}>{u.name}</div>
                      {u.id === currentUser.id && <span style={{ fontSize: 10, color: colors.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>You</span>}
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text2, overflow: 'hidden' }}>
                    <Mail size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                  </div>

                  {/* Role */}
                  <div>
                    <span style={{ ...getRoleColor(u.role), padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' }}>
                      {(u.role || 'User').replace('_', ' ')}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <span style={{ ...getStatusColor(u.status), padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {getStatusIcon(u.status)} {u.status}
                    </span>
                  </div>

                  {/* Joined */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.text2 }}>
                    <Clock size={13} style={{ opacity: 0.5 }} />
                    {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button className="um-action-btn" onClick={() => { setSelectedUser(u); setShowDetailsModal(true); }} style={actionBtnStyle('#60a5fa')} title="View details">
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="um-action-btn"
                      onClick={() => { setSelectedUser(u); setActionType(u.status === 'ACTIVE' ? 'suspend' : 'activate'); setShowActionModal(true); }}
                      disabled={u.role === 'ADMIN' && u.status === 'ACTIVE'}
                      style={actionBtnStyle(u.status === 'ACTIVE' ? '#f59e0b' : colors.success)}
                      title={u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    >
                      {u.status === 'ACTIVE' ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                    {currentUser.id !== u.id && (
                      <button className="um-action-btn" onClick={() => { setSelectedUser(u); setActionType('delete'); setShowActionModal(true); }} style={actionBtnStyle('#ef4444')} title="Delete user">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Users & Sub-Users from MongoDB */}
      <div style={{ animation: 'fadeInUp 0.9s ease-out', marginTop: 28 }}>
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          {/* Section Header */}
          <div style={{ padding: '24px 28px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ color: colors.text1, fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>All Users & Sub Users</h3>
              <p style={{ color: colors.text2, fontSize: 12, margin: '4px 0 0', opacity: 0.6 }}>Fetched from MongoDB &bull; {allDbUsers.length} users &bull; {allDbSubUsers.length} sub-users</p>
            </div>
            <button onClick={async () => {
              setDbUsersLoading(true);
              try { const data = await userAPI.getAllUsers(); if (data.success) { setAllDbUsers(data.users || []); setAllDbSubUsers(data.subUsers || []); } } catch (e) { console.error(e); }
              setDbUsersLoading(false);
            }} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bg2, color: colors.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.3s' }}>
              <RefreshCw size={14} style={{ animation: dbUsersLoading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>

          {dbUsersLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: colors.text2, fontWeight: 600, fontSize: 14, margin: 0 }}>Loading users from database...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (allDbUsers.length === 0 && allDbSubUsers.length === 0) ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Users size={40} style={{ color: colors.text2, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: colors.text2, fontWeight: 600, fontSize: 15, margin: 0 }}>No users found in database</p>
            </div>
          ) : (
            <>
              {/* Registered Users */}
              {allDbUsers.length > 0 && (
                <>
                  <div style={{ padding: '16px 28px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={16} style={{ color: colors.primary }} />
                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.primary }}>Registered Users</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: colors.text2, marginLeft: 4 }}>({allDbUsers.length})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 1fr 1.2fr', padding: '10px 28px', background: colors.bg2 }}>
                    {['Name', 'Email', 'Role', 'Status', 'Joined'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.text2, opacity: 0.5 }}>{h}</div>
                    ))}
                  </div>
                  {allDbUsers.map((u, idx) => (
                    <div key={u.id} className="um-row" style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 1fr 1.2fr', padding: '14px 28px', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, transition: 'background 0.2s', animation: `fadeInUp 0.4s ease-out ${idx * 0.03}s backwards` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: colors.primary, flexShrink: 0 }}>
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: colors.text1 }}>{u.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.text2, overflow: 'hidden' }}>
                        <Mail size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'inline-block', width: 'fit-content', background: u.role === 'Admin' ? 'rgba(239,68,68,0.08)' : 'rgba(0,217,255,0.08)', color: u.role === 'Admin' ? '#f87171' : colors.primary }}>{u.role}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle size={13} style={{ color: colors.success }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: colors.success }}>ACTIVE</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.text2 }}>
                        <Clock size={12} style={{ opacity: 0.4 }} />
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Sub Users */}
              {allDbSubUsers.length > 0 && (
                <>
                  <div style={{ padding: '20px 28px 8px', display: 'flex', alignItems: 'center', gap: 8, borderTop: allDbUsers.length > 0 ? `2px solid ${colors.border}` : 'none' }}>
                    <Users size={16} style={{ color: colors.accent || '#EC4899' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.accent || '#EC4899' }}>Sub Users</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: colors.text2, marginLeft: 4 }}>({allDbSubUsers.length})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.2fr 1fr 1.2fr', padding: '10px 28px', background: colors.bg2 }}>
                    {['Name', 'Email', 'Head User', 'Status', 'Joined'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.text2, opacity: 0.5 }}>{h}</div>
                    ))}
                  </div>
                  {allDbSubUsers.map((s, idx) => (
                    <div key={s.id} className="um-row" style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.2fr 1fr 1.2fr', padding: '14px 28px', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, transition: 'background 0.2s', animation: `fadeInUp 0.4s ease-out ${idx * 0.03}s backwards` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${(colors.accent || '#EC4899')}30, ${colors.secondary}30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: colors.accent || '#EC4899', flexShrink: 0 }}>
                          {s.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: colors.text1 }}>{s.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: colors.text2, overflow: 'hidden' }}>
                        <Mail size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.text2 }}>{s.headUserName || '—'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {s.status === 'ACTIVE' ? <CheckCircle size={13} style={{ color: colors.success }} /> : <XCircle size={13} style={{ color: colors.error }} />}
                        <span style={{ fontSize: 11, fontWeight: 700, color: s.status === 'ACTIVE' ? colors.success : colors.error }}>{s.status}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.text2 }}>
                        <Clock size={12} style={{ opacity: 0.4 }} />
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showActionModal && (
        <UserActionModal
          user={selectedUser}
          actionType={actionType}
          colors={colors}
          onConfirm={() => handleUserAction(actionType, selectedUser)}
          onClose={() => { setShowActionModal(false); setSelectedUser(null); }}
        />
      )}

      {showDetailsModal && (
        <UserDetailsModal
          user={selectedUser}
          colors={colors}
          onClose={() => { setShowDetailsModal(false); setSelectedUser(null); }}
        />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 480, ...cardStyle, padding: '40px 36px', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: colors.text1, margin: 0 }}>Invite New User</h3>
                <p style={{ fontSize: 13, color: colors.text2, margin: '4px 0 0', opacity: 0.6 }}>Add a team member to your organization</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setNewUserData({ name: '', email: '', password: '', allowedFeatures: [] }); setAddErrors({}); }} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bg2, color: colors.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, transition: 'all 0.2s' }}>
                &#10005;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'name', placeholder: 'Full Name', type: 'text', error: addErrors.name },
                { key: 'email', placeholder: 'Email Address', type: 'email', error: addErrors.email },
                { key: 'password', placeholder: 'Password', type: 'password', error: addErrors.password },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.text2, marginBottom: 6, opacity: 0.6 }}>{field.placeholder}</label>
                  <input
                    className="um-input"
                    placeholder={field.placeholder}
                    type={field.type}
                    value={newUserData[field.key]}
                    onChange={e => setNewUserData({ ...newUserData, [field.key]: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${field.error ? '#ef4444' : colors.border}`, backgroundColor: colors.bg2, color: colors.text1, fontSize: 14, fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  />
                  {field.error && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4, display: 'block' }}>{field.error}</span>}
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.text2, marginBottom: 10, opacity: 0.6 }}>Grant Feature Access</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_FEATURES.map(f => {
                    const active = newUserData.allowedFeatures.includes(f.id);
                    return (
                      <button key={f.id} onClick={() => {
                        const has = newUserData.allowedFeatures.includes(f.id);
                        setNewUserData({ ...newUserData, allowedFeatures: has ? newUserData.allowedFeatures.filter(x => x !== f.id) : [...newUserData.allowedFeatures, f.id] });
                      }} style={{
                        padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                        ...(active
                          ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: '#fff', boxShadow: `0 3px 12px ${colors.primary}40` }
                          : { backgroundColor: colors.bg2, color: colors.text2, border: `1px solid ${colors.border}` }
                        ),
                      }}>
                        {f.icon} {f.name}
                      </button>
                    );
                  })}
                </div>
                {addErrors.features && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 6, display: 'block' }}>{addErrors.features}</span>}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => { setShowAddModal(false); setNewUserData({ name: '', email: '', password: '', allowedFeatures: [] }); setAddErrors({}); }} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bg2, color: colors.text2, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
                  Cancel
                </button>
                <button onClick={async () => {
                  const errs = {};
                  if (!newUserData.name.trim()) errs.name = 'Name is required';
                  if (!newUserData.email.trim()) errs.email = 'Email is required';
                  if (!newUserData.password) errs.password = 'Password is required';
                  if (newUserData.allowedFeatures.length === 0) errs.features = 'Select at least one feature';
                  if (Object.keys(errs).length > 0) { setAddErrors(errs); return; }
                  try {
                    await addSubUser(currentUser.id, newUserData);
                    setSuccessMessage('User added successfully!');
                    setTimeout(() => setSuccessMessage(''), 3000);
                    setShowAddModal(false);
                    setNewUserData({ name: '', email: '', password: '', allowedFeatures: [] });
                    setAddErrors({});
                    await loadUsers();
                  } catch (e) {
                    setAddErrors({ submit: e.message || 'Could not add user' });
                  }
                }} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: `0 6px 20px ${colors.primary}40`, transition: 'all 0.3s' }}>
                  Invite User
                </button>
              </div>
              {addErrors.submit && <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, marginTop: 8, textAlign: 'center' }}>{addErrors.submit}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsersPage;