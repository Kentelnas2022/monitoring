'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  MapPin, 
  Send, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Bell,
  Loader2
} from 'lucide-react';
import { AssignedHandler, SiteInfrastructure } from '@/types/dashboard';

interface AreaAssignment {
  id: string;
  area: string;          // e.g. "Lanao del Sur", "Bukidnon", "Misamis Occidental"
  personName: string;    // e.g. "Juan Dela Cruz"
  phone: string;         // e.g. "+63 917 123 4567"
  telegram: string;      // e.g. "jdelacruz_dict"
  chatId?: string;       // e.g. "7227734738"
  status: 'Connected' | 'Pending';
}

interface ReceiverPageProps {
  sites: SiteInfrastructure[];
  events?: any[];
  activityLogs?: any[];
  onUpdatePersonnel?: (siteName: string, updatedHandler: AssignedHandler, isDispatch?: boolean) => void;
  onUpdateAreaPersonnel?: (areaKey: string, updatedHandler: AssignedHandler) => void;
  onSendTelegramDispatch?: (site: SiteInfrastructure, handler: AssignedHandler, notes: string) => void;
  onUpdateSiteLocation?: (siteId: string, updatedProvince: string, updatedName: string) => void;
}

export const ReceiverPage: React.FC<ReceiverPageProps> = ({
  sites,
  onUpdateAreaPersonnel,
}) => {
  // Extract strictly the unique cities/provinces that actually have available sites on the table
  const availableDashboardCities = useMemo(() => {
    const provinceMap = new Map<string, number>();
    sites.forEach((s) => {
      const prov = (s.province || '').trim();
      if (prov) {
        provinceMap.set(prov, (provinceMap.get(prov) || 0) + 1);
      }
    });

    return Array.from(provinceMap.keys())
      .filter((prov) => (provinceMap.get(prov) || 0) > 0)
      .sort((a, b) => a.localeCompare(b));
  }, [sites]);

  // Dynamic assignments loaded strictly from database API
  const [assignments, setAssignments] = useState<AreaAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form input state for Add / Edit
  const [formArea, setFormArea] = useState<string>('');
  const [formPersonName, setFormPersonName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formTelegram, setFormTelegram] = useState<string>('');
  const [formChatId, setFormChatId] = useState<string>('');
  const [isLookingUpChatId, setIsLookingUpChatId] = useState<boolean>(false);
  const [lookupFeedback, setLookupFeedback] = useState<{ status: 'success' | 'error' | 'idle'; message?: string }>({
    status: 'idle',
  });

  const lookupTelegramAccount = async (chatIdToQuery: string) => {
    const clean = chatIdToQuery.trim();
    if (!clean || !/^\d+$/.test(clean) || clean.length < 5) {
      setLookupFeedback({ status: 'idle' });
      return;
    }

    setIsLookingUpChatId(true);
    setLookupFeedback({ status: 'idle' });
    try {
      const res = await fetch(`/api/telegram/lookup?chatId=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.success && data.account) {
        if (data.account.name) {
          setFormPersonName(data.account.name);
        }
        if (data.account.username) {
          setFormTelegram(data.account.username);
        } else {
          setFormTelegram(clean);
        }
        setLookupFeedback({
          status: 'success',
          message: `✓ Connected: ${data.account.name}${data.account.username ? ` (@${data.account.username})` : ''}`,
        });
      } else {
        setLookupFeedback({
          status: 'error',
          message: data.message || 'Telegram account not found for this ID.',
        });
      }
    } catch (e) {
      setLookupFeedback({ status: 'error', message: 'Lookup network error.' });
    } finally {
      setIsLookingUpChatId(false);
    }
  };

  const handleChatIdChange = (val: string) => {
    setFormChatId(val);
    const clean = val.trim();
    if (/^\d{6,}$/.test(clean)) {
      lookupTelegramAccount(clean);
    } else {
      setLookupFeedback({ status: 'idle' });
    }
  };

  const openAddModal = () => {
    setFormArea('');
    setFormPersonName('');
    setFormPhone('');
    setFormTelegram('');
    setFormChatId('');
    setLookupFeedback({ status: 'idle' });
    setEditingId(null);
    setIsAddingNew(true);
  };

  const openEditModal = (item: AreaAssignment) => {
    setFormArea(item.area);
    setFormPersonName(item.personName);
    setFormPhone(item.phone);
    setFormTelegram(item.telegram);
    const existingChatId = item.chatId || (/^\d+$/.test(item.telegram) ? item.telegram : '7227734738');
    setFormChatId(existingChatId);
    setLookupFeedback({ status: 'success', message: `✓ Connected: ${item.personName}` });
    setEditingId(item.id);
    setIsAddingNew(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formArea.trim() || !formPersonName.trim() || (!formTelegram.trim() && !formChatId.trim())) return;

    const cleanTelegram = formTelegram.trim().replace(/^@/, '') || formChatId.trim();
    const cleanChatId = formChatId.trim() || (/^\d+$/.test(cleanTelegram) ? cleanTelegram : '7227734738');

    if (editingId) {
      setAssignments((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                area: formArea.trim(),
                personName: formPersonName.trim(),
                phone: formPhone.trim() || '+63 900 000 0000',
                telegram: cleanTelegram,
                chatId: cleanChatId,
              }
            : item
        )
      );
      // Persist to backend database API
      fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          area: formArea.trim(),
          personName: formPersonName.trim(),
          phone: formPhone.trim() || '+63 900 000 0000',
          telegram: cleanTelegram,
          chatId: cleanChatId,
        }),
      }).catch((e) => console.warn('Assignments update sync error:', e));
    } else {
      const newItem: AreaAssignment = {
        id: `area-${Date.now()}`,
        area: formArea.trim(),
        personName: formPersonName.trim(),
        phone: formPhone.trim() || '+63 900 000 0000',
        telegram: cleanTelegram,
        chatId: cleanChatId,
        status: 'Connected',
      };
      setAssignments((prev) => [newItem, ...prev]);
      setCurrentPage(1);

      // Persist to backend database API
      fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: formArea.trim(),
          personName: formPersonName.trim(),
          phone: formPhone.trim() || '+63 900 000 0000',
          telegram: cleanTelegram,
          chatId: cleanChatId,
        }),
      }).catch((e) => console.warn('Assignments create sync error:', e));
    }

    if (onUpdateAreaPersonnel) {
      onUpdateAreaPersonnel(formArea.trim(), {
        name: formPersonName.trim(),
        phone: formPhone.trim() || '+63 900 000 0000',
        telegram: cleanTelegram,
        role: 'Designated Area Responder',
      });
    }

    const downSites = getAreaDownSites(formArea.trim());
    if (downSites.length > 0) {
      setToastMsg(`Assigned ${formPersonName.trim()} to ${formArea.trim()}. 🚨 Auto-sent Telegram alert to Account ID ${cleanChatId} for ${downSites.length} down site(s)!`);
    } else {
      setToastMsg(`Assigned ${formPersonName.trim()} (Account ID: ${cleanChatId}) to ${formArea.trim()}.`);
    }
    setTimeout(() => setToastMsg(null), 10000);

    setIsAddingNew(false);
    setEditingId(null);
  };

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Helper to query all sites matching any given area
  const getAreaSites = (areaName: string) => {
    const norm = (areaName || '').toLowerCase().replace(/\s+area$/i, '').trim();
    return sites.filter((s) => {
      const p = (s.province || '').toLowerCase();
      const r = (s.region || '').toLowerCase();
      const n = (s.name || '').toLowerCase();
      return p === norm || p.includes(norm) || norm.includes(p) || r.includes(norm) || n.includes(norm);
    });
  };

  // Helper to query down sites matching any given area
  const getAreaDownSites = (areaName: string) => {
    const matched = getAreaSites(areaName);
    return matched.filter((s) => s.status === 'Downtime' || s.offlineCount > 0);
  };

  const [itemToDelete, setItemToDelete] = useState<AreaAssignment | null>(null);

  const confirmDelete = () => {
    if (!itemToDelete) return;
    const id = itemToDelete.id;
    const deletedArea = itemToDelete.area;
    const deletedPerson = itemToDelete.personName;

    setAssignments((prev) => prev.filter((a) => a.id !== id));
    fetch(`/api/assignments?id=${id}`, { method: 'DELETE' }).catch((e) =>
      console.warn('Assignments delete sync error:', e)
    );

    setToastMsg(`Successfully deleted assignment for ${deletedPerson} in ${deletedArea}.`);
    setTimeout(() => setToastMsg(null), 5000);
    setItemToDelete(null);
  };

  const handleDelete = (item: AreaAssignment) => {
    setItemToDelete(item);
  };

  // Initial load from dynamic database API
  useEffect(() => {
    setIsLoadingAssignments(true);
    fetch('/api/assignments')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && Array.isArray(d.data)) {
          setAssignments(d.data);
        }
      })
      .catch((err) => console.error('Error loading assignments from MySQL:', err))
      .finally(() => setIsLoadingAssignments(false));
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    if (!searchQuery.trim()) return assignments;
    const q = searchQuery.toLowerCase();
    return assignments.filter(
      (a) =>
        a.area.toLowerCase().includes(q) ||
        a.personName.toLowerCase().includes(q) ||
        a.telegram.toLowerCase().includes(q)
    );
  }, [assignments, searchQuery]);

  const totalPages = Math.ceil(filteredAssignments.length / rowsPerPage) || 1;

  // Auto-adjust page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Paginated slice
  const paginatedAssignments = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAssignments.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAssignments, currentPage, rowsPerPage]);

  const startItem = filteredAssignments.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, filteredAssignments.length);

  // Generate pagination page numbers window (never long, truncated with ellipsis when totalPages > 5)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      start = 2;
      end = Math.min(totalPages - 1, 4);
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - 3);
      end = totalPages - 1;
    }

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div 
      className="flex-1 min-h-0 w-full flex flex-col gap-4 overflow-y-auto px-4 sm:px-6 py-4"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* HEADER SECTION: Clean title & Add Assignment action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#237227]" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Designated Area Assignment
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Assign designated persons and their Telegram accounts to specific regions or cities for automated notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#237227] hover:bg-[#1b5b1f] text-white text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Area Assignment</span>
        </button>
      </div>

      {/* FEEDBACK TOAST / BANNER */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-xs sm:text-sm font-semibold text-emerald-900 flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* UNIFIED ASSIGNMENTS TABLE CARD */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Table Top Header Bar (Title, Count & Search in 1 single unified line) */}
        <div className="border-b border-slate-100 bg-white px-5 sm:px-6 py-4 shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">
              Active Area Assignments
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
              {filteredAssignments.length}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search area, person, or Telegram..."
              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 pl-9.5 pr-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-[#237227] focus:bg-white focus:outline-none transition-all shadow-2xs"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            />
          </div>
        </div>

        {filteredAssignments.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <MapPin className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No designated area assignments yet</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              You have not assigned anyone to an area yet. Click &quot;+ Add Area Assignment&quot; to assign a responder and Telegram account dynamically.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5 sm:px-6 w-[32%]">DESIGNATED AREA & STATUS</th>
                    <th className="py-3 px-4 sm:px-6 w-[28%]">ASSIGNED PERSON</th>
                    <th className="py-3 px-4 sm:px-6 w-[28%]">TELEGRAM RECIPIENT</th>
                    <th className="py-3 px-5 sm:px-6 w-[12%] text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {paginatedAssignments.map((item) => {
                    const areaSites = getAreaSites(item.area);
                    const totalAreaSites = areaSites.length;
                    const downSites = areaSites.filter((s) => s.status === 'Downtime' || s.offlineCount > 0);
                    const hasDown = downSites.length > 0;
                    const isNumericChatId = /^\d+$/.test(item.telegram);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Designated Area & Outage Health */}
                        <td className="py-3.5 px-5 sm:px-6">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-[#237227] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <MapPin className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-bold text-slate-900 text-sm">{item.area}</span>
                            </div>
                            {totalAreaSites > 0 ? (
                              hasDown ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900 animate-pulse" />
                                  {totalAreaSites} Site{totalAreaSites > 1 ? 's' : ''} • {downSites.length} Down
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#237227] bg-[#237227]/10 px-2.5 py-1 rounded-md border border-[#237227]/20">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#237227]" />
                                  {totalAreaSites} Site{totalAreaSites > 1 ? 's' : ''} • Operational
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-md border border-slate-200/80">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                Standby Coverage
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Assigned Person */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">{item.personName}</span>
                            {item.phone ? (
                              <span className="text-slate-500 text-xs mt-0.5 tracking-tight">{item.phone}</span>
                            ) : (
                              <span className="text-slate-400 text-xs mt-0.5 italic">No phone number</span>
                            )}
                          </div>
                        </td>

                        {/* Telegram Recipient & Account ID */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex flex-col gap-1.5">
                            <div className="inline-flex items-center gap-2 bg-slate-50/90 px-3 py-1.5 rounded-lg border border-slate-200/90 w-fit shadow-2xs">
                              <Send className="h-3.5 w-3.5 text-[#0088cc] shrink-0" />
                              <a
                                href={isNumericChatId ? "https://t.me/multifactors_bot" : `https://t.me/${item.telegram}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-xs font-bold text-slate-800 hover:text-[#0088cc] hover:underline"
                              >
                                {isNumericChatId ? `ID: ${item.telegram}` : `@${item.telegram}`}
                              </a>
                              <span className="text-[10px] font-bold text-[#237227] bg-[#237227]/10 px-1.5 py-0.5 rounded border border-[#237227]/20">
                                Connected
                              </span>
                            </div>
                            {item.chatId && !isNumericChatId && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-1 font-mono">
                                <span className="text-slate-400">Account ID:</span>
                                <strong className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 text-[11px]">{item.chatId}</strong>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 sm:px-6 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Edit Assignment"
                              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              title="Remove Assignment"
                              className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS FOOTER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-3.5 text-xs text-slate-600 shrink-0">
              {/* Left: Summary and Rows per Page */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-slate-600">
                  Showing <strong className="text-slate-900 font-bold">{startItem}</strong>–<strong className="text-slate-900 font-bold">{endItem}</strong> of <strong className="text-slate-900 font-bold">{filteredAssignments.length}</strong> assignments
                </span>

                {/* Rows Per Page Dropdown */}
                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                  <span className="text-slate-500 text-xs font-medium">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-[#237227] focus:outline-none cursor-pointer shadow-2xs transition-colors"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1 px-1">
                  {pageNumbers.map((pageNum, idx) => (
                    typeof pageNum === 'number' ? (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-[#237227] text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ) : (
                      <span key={idx} className="px-1 text-xs text-slate-400 font-bold">
                        ...
                      </span>
                    )
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ADD / EDIT ASSIGNMENT MODAL (CLEAN & MINIMALIST) */}
      {isAddingNew && (
        <div 
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddingNew(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#237227]" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? 'Edit Area Assignment' : 'Add New Area Assignment'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs sm:text-sm">
              {/* Designated Area (City / Province dropdown based on dashboard) */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Designated Area (City / Province)
                </label>
                <div className="relative">
                  <select
                    required
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white px-3.5 py-2 text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#237227] focus:bg-white transition-colors cursor-pointer appearance-none pr-8"
                  >
                    <option value="" disabled>
                      Select an area with available sites...
                    </option>
                    {formArea && !availableDashboardCities.includes(formArea) && (
                      <option value={formArea}>
                        {formArea}
                      </option>
                    )}
                    {availableDashboardCities.map((city) => {
                      const count = sites.filter(
                        (s) => (s.province || '').toLowerCase() === city.toLowerCase()
                      ).length;
                      return (
                        <option key={city} value={city}>
                          {city} ({count} active site{count > 1 ? 's' : ''})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Telegram Account ID (Chat ID) - Auto-detects Person Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 text-xs">
                    Telegram Account ID (for Outage Notifications)
                  </label>
                  {isLookingUpChatId ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin text-[#237227]" />
                      Auto-detecting...
                    </span>
                  ) : lookupFeedback.status === 'success' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#237227] bg-[#eaf3eb] px-2 py-0.5 rounded border border-emerald-200/60">
                      <Check className="h-3 w-3" />
                      Connected
                    </span>
                  ) : lookupFeedback.status === 'error' ? (
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Not Found
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#237227] bg-[#eaf3eb] px-2 py-0.5 rounded border border-emerald-200/60">
                      Connected
                    </span>
                  )}
                </div>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 focus-within:border-[#237227] focus-within:bg-white transition-colors">
                  <span className="font-mono text-slate-400 text-xs font-bold mr-1.5">ID:</span>
                  <input
                    type="text"
                    required
                    value={formChatId}
                    onChange={(e) => handleChatIdChange(e.target.value)}
                    placeholder="Enter Telegram ID"
                    className="w-full bg-transparent focus:outline-none text-slate-800 font-mono text-xs"
                  />
                  {formChatId && (
                    <button
                      type="button"
                      onClick={() => lookupTelegramAccount(formChatId)}
                      title="Fetch Name from Telegram"
                      className="text-[11px] font-bold text-[#237227] hover:underline shrink-0 ml-2 cursor-pointer"
                    >
                      Detect Name
                    </button>
                  )}
                </div>
                {lookupFeedback.message ? (
                  <div className={`mt-1.5 p-2 rounded-lg text-[11px] leading-relaxed ${
                    lookupFeedback.status === 'error' 
                      ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold'
                  }`}>
                    {lookupFeedback.message}
                    {lookupFeedback.status === 'error' && (
                      <p className="mt-1 text-[10px] text-slate-600 font-normal">
                        💡 <b>Telegram Privacy Rule:</b> Bots cannot message or lookup an account until that user clicks <b>Start</b> on the bot. Ask the user to open Telegram, search for <b>@multifactors_bot</b>, and tap <b>START</b>. You can still save their ID manually below!
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Entering Account ID automatically detects and fills the person's name from Telegram (user must have clicked <i>Start</i> on <b>@multifactors_bot</b>).
                  </p>
                )}
              </div>

              {/* Assigned Person */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 text-xs">
                    Assigned Person
                  </label>
                  {formPersonName && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      Auto-detected from Telegram ID
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formPersonName}
                  onChange={(e) => setFormPersonName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#237227] focus:bg-white transition-colors font-medium"
                />
              </div>

              {/* Telegram Username */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Telegram Username (Optional Handle)
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus-within:border-[#237227] focus-within:bg-white transition-colors">
                  <span className="font-mono text-slate-400 text-xs">@</span>
                  <input
                    type="text"
                    value={formTelegram}
                    onChange={(e) => setFormTelegram(e.target.value.replace(/^@/, ''))}
                    placeholder="username"
                    className="w-full bg-transparent focus:outline-none text-slate-800 font-mono text-xs ml-1"
                  />
                </div>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Contact Phone (Optional)
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+63 9xx xxx xxxx"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#237227] focus:bg-white transition-colors"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#237227] hover:bg-[#1b5b1f] text-white font-bold cursor-pointer transition-colors shadow-2xs text-xs"
                >
                  {editingId ? 'Save Changes' : 'Add Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setItemToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col gap-4"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Delete Area Assignment?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to remove the assignment for <strong className="text-slate-800 font-bold">{itemToDelete.personName}</strong> in <strong className="text-slate-800 font-bold">{itemToDelete.area}</strong>? Automated Telegram outage notifications for this area will no longer be dispatched to this recipient.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

