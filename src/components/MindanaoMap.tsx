'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SiteInfrastructure } from '@/types/dashboard';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin,
  Radio,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type * as LType from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MindanaoMapProps {
  sites: SiteInfrastructure[];
  onSelectSite: (site: SiteInfrastructure) => void;
  onOpenSiteDetails?: (site: SiteInfrastructure) => void;
  selectedSiteId?: string | null;
  alertingSiteId?: string | null;
  isTvMode?: boolean;
}

// Center coordinates for Northern Mindanao (Region 10: Lanao del Norte, Misamis Occidental, Misamis Oriental, Camiguin, Bukidnon)
const MINDANAO_CENTER: [number, number] = [8.45, 124.35];
const DEFAULT_ZOOM = 8.5;

// Helper to construct radar beacon SVG icons
const createMarkerIcon = (
  L: any,
  site: SiteInfrastructure,
  isAlerting: boolean
) => {
  const isAllOffline = site.offlineCount === site.deviceCount && site.deviceCount > 0;
  const isPartialOffline = site.offlineCount > 0 && site.offlineCount < site.deviceCount;
  const isDowntime = isAllOffline || isPartialOffline || site.status === 'Downtime';

  let iconHtml = '';
  if (isAlerting) {
    iconHtml = `
      <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <svg width="72" height="72" viewBox="0 0 72 72" style="overflow: visible;">
          <circle cx="36" cy="36" r="10" fill="none" stroke="#ef4444" class="svg-beacon-urgent-ring" pointer-events="none" />
          <circle cx="36" cy="36" r="10" fill="none" stroke="#f87171" class="svg-beacon-urgent-ring" style="animation-delay: 0.5s;" pointer-events="none" />
          <circle cx="36" cy="36" r="9" class="svg-beacon-urgent-core" />
          <circle cx="36" cy="36" r="3" fill="#ffffff" />
        </svg>
      </div>
    `;
  } else if (isAllOffline) {
    iconHtml = `
      <div style="width: 56px; height: 56px; display: flex; items-center; justify-content: center; cursor: pointer;">
        <svg width="56" height="56" viewBox="0 0 56 56" style="overflow: visible;">
          <circle cx="28" cy="28" r="8" fill="none" stroke="#e11d48" class="svg-beacon-pulse-ring" pointer-events="none" />
          <circle cx="28" cy="28" r="8" fill="none" stroke="#f43f5e" class="svg-beacon-pulse-ring-delayed" pointer-events="none" />
          <circle cx="28" cy="28" r="7" fill="#e11d48" stroke="#ffffff" stroke-width="2.5" />
          <circle cx="28" cy="28" r="2" fill="#ffffff" />
        </svg>
      </div>
    `;
  } else if (isPartialOffline) {
    iconHtml = `
      <div style="width: 56px; height: 56px; display: flex; items-center; justify-content: center; cursor: pointer;">
        <svg width="56" height="56" viewBox="0 0 56 56" style="overflow: visible;">
          <circle cx="28" cy="28" r="8" fill="none" stroke="#d97706" class="svg-beacon-pulse-ring" pointer-events="none" />
          <circle cx="28" cy="28" r="8" fill="none" stroke="#f59e0b" class="svg-beacon-pulse-ring-delayed" pointer-events="none" />
          <circle cx="28" cy="28" r="6.5" fill="#d97706" stroke="#ffffff" stroke-width="2" />
          <circle cx="28" cy="28" r="2" fill="#ffffff" />
        </svg>
      </div>
    `;
  } else {
    iconHtml = `
      <div style="width: 24px; height: 24px; display: flex; items-center; justify-content: center; cursor: pointer;">
        <svg width="24" height="24" viewBox="0 0 24 24" style="overflow: visible;">
          <circle cx="12" cy="12" r="5.5" fill="#237227" stroke="#ffffff" stroke-width="2" />
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
        </svg>
      </div>
    `;
  }

  return L.divIcon({
    html: iconHtml,
    className: 'leaflet-beacon-marker',
    iconSize: isAlerting ? [72, 72] : isDowntime ? [56, 56] : [24, 24],
    iconAnchor: isAlerting ? [36, 36] : isDowntime ? [28, 28] : [12, 12],
  });
};

export const MindanaoMap: React.FC<MindanaoMapProps> = ({
  sites,
  onSelectSite,
  onOpenSiteDetails,
  selectedSiteId,
  alertingSiteId,
  isTvMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LType.Map | null>(null);
  const tileLayerRef = useRef<LType.TileLayer | null>(null);
  const markersLayerRef = useRef<LType.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, LType.Marker>>(new Map());
  const activePopupSiteIdRef = useRef<string | null>(null);
  const isDirectMapClickRef = useRef<boolean>(false);

  const [mapReady, setMapReady] = useState<boolean>(false);
  const [activeMapType, setActiveMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Filter sites that have valid coordinates
  const sitesWithCoords = useMemo(() => {
    return sites.filter((s) => s.coordinates && s.coordinates.lat && s.coordinates.lng);
  }, [sites]);

  // Global listener for Inspect Details button inside Leaflet popup cards (opens SiteContactModal)
  useEffect(() => {
    (window as any).__openSiteDetailsModal = (siteId: string) => {
      const site = sites.find((s) => s.id === siteId);
      if (site && onOpenSiteDetails) {
        onOpenSiteDetails(site);
      }
    };
    return () => {
      delete (window as any).__openSiteDetailsModal;
    };
  }, [sites, onOpenSiteDetails]);

  // Counts by status among currently displayed map sites
  const counts = useMemo(() => {
    return {
      allOffline: sitesWithCoords.filter((s) => s.offlineCount === s.deviceCount && s.deviceCount > 0).length,
      offline: sitesWithCoords.filter((s) => s.offlineCount > 0 && s.offlineCount < s.deviceCount).length,
      operational: sitesWithCoords.filter((s) => s.offlineCount === 0).length,
      total: sitesWithCoords.length,
    };
  }, [sitesWithCoords]);

  // Generate Google Maps-style popup card HTML
  const generatePopupContent = useCallback((site: SiteInfrastructure) => {
    const isAllOffline = site.offlineCount === site.deviceCount && site.deviceCount > 0;
    const isPartialOffline = site.offlineCount > 0 && site.offlineCount < site.deviceCount;
    const isDowntime = isAllOffline || isPartialOffline || site.status === 'Downtime';
    const isOffline = isAllOffline || isPartialOffline || isDowntime;

    // Strict White, Gray, and Primary Green palette
    const badgeBg = isOffline ? '#f4f4f5' : '#eaf3eb';
    const badgeColor = isOffline ? '#52525b' : '#237227';
    const badgeBorder = isOffline ? '#e4e4e7' : 'rgba(35,114,39,0.25)';
    const badgeDot = isOffline ? '#71717a' : '#237227';
    const badgeText = isAllOffline 
      ? `All Offline (${site.offlineCount}/${site.deviceCount})` 
      : isPartialOffline 
      ? `Offline (${site.offlineCount}/${site.deviceCount})` 
      : 'Online';

    return `
      <div style="padding: 12px 14px; font-family: Arial, -apple-system, sans-serif; min-width: 250px; color: #18181b; line-height: 1.4; background: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; padding-right: 14px;">
          <span style="font-size: 10px; font-family: monospace; color: #71717a; font-weight: 700; text-transform: uppercase;">
            ${site.code} • ${site.municipality || site.province}${site.municipality && site.municipality !== site.province ? ', ' + site.province : ''}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${badgeDot};"></span>
            ${badgeText}
          </span>
        </div>
        
        <div style="font-size: 14px; font-weight: 800; color: #09090b; margin-bottom: 3px; line-height: 1.3;">
          ${site.landmark || site.name}
        </div>
        ${site.landmark ? `
        <div style="font-size: 11px; font-weight: 500; color: #71717a; margin-bottom: 8px;">
          ${site.name}
        </div>` : '<div style="margin-bottom: 8px;"></div>'}
        
        <div style="padding-top: 8px; border-top: 1px solid #f4f4f5; display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #71717a;">IP Address:</span>
            <span style="font-family: monospace; font-weight: 700; color: #18181b;">${site.lastKnownIp}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #71717a;">Device Health:</span>
            <span style="font-weight: 700; color: ${isOffline ? '#3f3f46' : '#237227'};">
              ${site.offlineCount > 0 ? `${site.offlineCount}/${site.deviceCount} down` : `${site.onlineCount}/${site.deviceCount} Online`}
            </span>
          </div>

          ${(site.apCount || 0) > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #71717a;">Access Points:</span>
            <span style="font-weight: 700; color: ${(site.apOffline || 0) > 0 ? '#b91c1c' : '#237227'};">
              ${(site.apOffline || 0) > 0 ? `${site.apOffline}/${site.apCount} AP down` : `${site.apCount} AP ok`}
            </span>
          </div>` : ''}

          ${isDowntime ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #71717a;">Alarm Type:</span>
            <span style="font-weight: 600; color: #52525b;">${site.alarmType || 'All device offline'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #71717a;">Downtime:</span>
            <span style="font-weight: 700; color: #18181b;">${site.downtimeDuration || 'Active'}</span>
          </div>
          ` : ''}
        </div>

        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f4f4f5; font-size: 11px; color: #71717a; display: flex; justify-content: space-between; align-items: center; gap: 6px;">
          <span>Contact: <strong style="color: #18181b;">${site.assignedHandler?.name || 'Field Team'}</strong></span>
          <button type="button" onclick="window.__openSiteDetailsModal && window.__openSiteDetailsModal('${site.id}')" title="Click to view full site specifications & contact modal" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; background: #237227; color: #ffffff; font-size: 10px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 1px 2px rgba(35,114,39,0.25); transition: opacity 0.15s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            Inspect →
          </button>
        </div>
      </div>
    `;
  }, []);

  // Initialize Map with Google Maps Tile Engine
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    let isCancelled = false;

    import('leaflet').then((L) => {
      if (isCancelled || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: MINDANAO_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 7,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
        closePopupOnClick: false,
      });

      map.on('popupopen', (e: any) => {
        for (const [id, marker] of markersMapRef.current.entries()) {
          if (marker.getPopup() === e.popup) {
            activePopupSiteIdRef.current = id;
            break;
          }
        }
      });

      map.on('popupclose', (e: any) => {
        for (const [id, marker] of markersMapRef.current.entries()) {
          if (marker.getPopup() === e.popup) {
            if (activePopupSiteIdRef.current === id) {
              activePopupSiteIdRef.current = null;
            }
            break;
          }
        }
      });

      // Free Official Google Maps Roadmap Tiles
      const googleTileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      }).addTo(map);

      tileLayerRef.current = googleTileLayer;

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Resize
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [mapReady]);

  // Toggle Map Type (Roadmap vs Satellite Hybrid)
  const handleToggleMapType = (type: 'roadmap' | 'satellite') => {
    setActiveMapType(type);
    if (!mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (tileLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }

      // 'm' = Roadmap, 'y' = Hybrid (Satellite + Roads/Labels)
      const layerType = type === 'satellite' ? 'y' : 'm';
      const newLayer = L.tileLayer(`https://mt{s}.google.com/vt/lyrs=${layerType}&x={x}&y={y}&z={z}`, {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      });

      if (mapInstanceRef.current) {
        newLayer.addTo(mapInstanceRef.current);
        tileLayerRef.current = newLayer;
      }
    });
  };

  // Render and update SVG Concentric Radar Markers in-place (zero layer clearing to prevent popup blinking)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !markersLayerRef.current) return;

    import('leaflet').then((L) => {
      const markersLayer = markersLayerRef.current;
      if (!markersLayer) return;

      const currentSiteIds = new Set(sitesWithCoords.map((s) => s.id));

      // 1. Remove obsolete markers
      for (const [id, marker] of markersMapRef.current.entries()) {
        if (!currentSiteIds.has(id)) {
          markersLayer.removeLayer(marker);
          markersMapRef.current.delete(id);
        }
      }

      // 2. Synchronize markers in-place without tearing down layers or blinking popups
      sitesWithCoords.forEach((site) => {
        const isAllOffline = site.offlineCount === site.deviceCount && site.deviceCount > 0;
        const isPartialOffline = site.offlineCount > 0 && site.offlineCount < site.deviceCount;
        const isAlerting = alertingSiteId === site.id;

        const customIcon = createMarkerIcon(L, site, isAlerting);
        const zIndexOffset = isAlerting ? 3500 : isAllOffline ? 1000 : isPartialOffline ? 800 : 100;
        const popupContent = generatePopupContent(site);

        const existingMarker = markersMapRef.current.get(site.id);

        if (existingMarker) {
          // Update icon & zIndex without affecting open popup state
          existingMarker.setIcon(customIcon);
          existingMarker.setZIndexOffset(zIndexOffset);

          // Update popup content seamlessly in-place — never closes, never blinks
          existingMarker.setPopupContent(popupContent);
        } else {
          // Create new marker
          const marker = L.marker([site.coordinates!.lat, site.coordinates!.lng], {
            icon: customIcon,
            zIndexOffset,
          });

          marker.bindPopup(popupContent, {
            maxWidth: 320,
            className: 'leaflet-custom-popup',
            closeOnClick: false,
            autoClose: true,
            autoPan: true,
            autoPanPadding: [20, 20],
          });

          marker.on('click', () => {
            isDirectMapClickRef.current = true;
            activePopupSiteIdRef.current = site.id;
            onSelectSite(site);
          });

          marker.addTo(markersLayer);
          markersMapRef.current.set(site.id, marker);
        }
      });
    });
  }, [sitesWithCoords, alertingSiteId, mapReady, onSelectSite, generatePopupContent]);

  // AUTO-LOCATE AND ACCURATELY VIEW DOWNTIME SITE AREA
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !alertingSiteId) return;
    const targetSite = sitesWithCoords.find((s) => s.id === alertingSiteId);
    if (targetSite?.coordinates) {
      const map = mapInstanceRef.current;
      map.flyTo([targetSite.coordinates.lat, targetSite.coordinates.lng], 13, {
        duration: 1.2,
      });

      map.once('moveend', () => {
        const marker = markersMapRef.current.get(targetSite.id);
        if (marker) {
          activePopupSiteIdRef.current = targetSite.id;
          marker.openPopup();
        }
      });
    }
  }, [alertingSiteId, mapReady, sitesWithCoords]);

  // Fly to selected site from table (skips if clicked directly on map to keep popup in standby)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !selectedSiteId || alertingSiteId) return;

    if (isDirectMapClickRef.current) {
      isDirectMapClickRef.current = false;
      return;
    }

    const targetSite = sitesWithCoords.find((s) => s.id === selectedSiteId);
    if (targetSite?.coordinates) {
      const map = mapInstanceRef.current;
      map.flyTo([targetSite.coordinates.lat, targetSite.coordinates.lng], 12, {
        duration: 1.0,
      });

      map.once('moveend', () => {
        const marker = markersMapRef.current.get(targetSite.id);
        if (marker) {
          activePopupSiteIdRef.current = targetSite.id;
          marker.openPopup();
        }
      });
    }
  }, [selectedSiteId, alertingSiteId, mapReady, sitesWithCoords]);

  // Controls Handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetZoom = () => {
    activePopupSiteIdRef.current = null;
    mapInstanceRef.current?.closePopup();
    mapInstanceRef.current?.flyTo(MINDANAO_CENTER, DEFAULT_ZOOM, { duration: 1.0 });
  };

  // ── Fullscreen State (persisted across reloads via localStorage) ──────────
  // Initialized to false to ensure server and client HTML match during initial hydration
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Restore persisted fullscreen state after initial mount (prevents SSR hydration error)
  useEffect(() => {
    try {
      if (localStorage.getItem('mindanaoMapFullscreen') === 'true') {
        setIsFullscreen(true);
      }
    } catch {}
  }, []);

  // Toggle handler — enter/exit both CSS overlay AND native browser fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mindanaoMapFullscreen', next ? 'true' : 'false');
      } catch {}

      if (next) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // Listen for Esc key only — will NOT auto-exit on reload or external fullscreenchange
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        handleToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleToggleFullscreen]);

  // Recalculate Leaflet tile dimensions when fullscreen is toggled or restored on mount
  useEffect(() => {
    const t1 = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 60);
    const t2 = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 220);
    const t3 = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isFullscreen]);

  return (
    <div 
      className={`flex flex-col h-full overflow-hidden bg-white transition-all duration-200 ${
        isFullscreen 
          ? 'fixed inset-0 z-[9990] w-full h-full rounded-none shadow-2xl' 
          : 'relative rounded-2xl border border-zinc-200 shadow-xs'
      }`}
    >
      {/* Top Map Header Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 sm:px-5 py-2.5 bg-white z-10 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#237227]/10 text-[#237227] shrink-0">
            <Radio className="h-4 w-4 animate-pulse text-[#237227]" />
          </div>
          <div className="truncate min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 leading-tight truncate">
                Mindanao Google Topology Map
              </h3>
              {isFullscreen && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#237227]/10 text-[#237227] border border-[#237227]/20 whitespace-nowrap">
                  Full Screen Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 font-normal truncate hidden md:block">
              Region X • BARMM • Real-time Outage Tracking (8.25° N, 124.6° E)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Map / Satellite Toggle */}
          <div className="flex items-center bg-zinc-100 border border-zinc-200/80 p-0.5 rounded-xl text-[11px] font-semibold shrink-0">
            <button
              type="button"
              onClick={() => handleToggleMapType('roadmap')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMapType === 'roadmap'
                  ? 'bg-[#237227] text-white font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => handleToggleMapType('satellite')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeMapType === 'satellite'
                  ? 'bg-[#237227] text-white font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Zoom & Reset Toolbar */}
          <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-xl p-0.5 shadow-2xs shrink-0">
            <button 
              type="button" 
              onClick={handleZoomIn} 
              className="p-1.5 rounded-lg text-zinc-500 hover:text-[#237227] hover:bg-zinc-100 transition-colors cursor-pointer" 
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button 
              type="button" 
              onClick={handleZoomOut} 
              className="p-1.5 rounded-lg text-zinc-500 hover:text-[#237227] hover:bg-zinc-100 transition-colors cursor-pointer" 
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button 
              type="button" 
              onClick={handleResetZoom} 
              className="p-1.5 rounded-lg text-zinc-500 hover:text-[#237227] hover:bg-zinc-100 transition-colors cursor-pointer" 
              title="Reset to Mindanao Center"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Proper Fullscreen / Exit Fullscreen Button */}
          <button 
            type="button" 
            onClick={handleToggleFullscreen} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs ${
              isFullscreen 
                ? 'bg-[#237227] text-white border-[#237227] hover:bg-[#1b5e20]' 
                : 'bg-white text-zinc-700 border-zinc-200 hover:border-[#237227]/50 hover:text-[#237227] hover:bg-zinc-50'
            }`}
            title={isFullscreen ? "Exit Full Screen" : "Adjust to Full Screen"}
            aria-label={isFullscreen ? "Exit Full Screen" : "Adjust to Full Screen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 shrink-0" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-[#237227] shrink-0" />
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="relative flex-1 min-h-0 w-full bg-[#f8fafc] overflow-hidden">
        {/* Leaflet 2D Roadmap & Satellite View */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-full absolute inset-0 z-0" 
        />

        {/* Floating Google Maps-Style Fullscreen Toggle Button on Canvas */}
        <div className="absolute top-3 right-3 z-[400]">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-zinc-200/90 shadow-md transition-all cursor-pointer ${
              isFullscreen 
                ? 'bg-[#237227] text-white border-[#237227] hover:bg-[#1b5e20]' 
                : 'text-zinc-700 hover:text-[#237227] hover:bg-zinc-50'
            }`}
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Toggle Full Screen'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-600 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
            </span>
            <span className="text-zinc-700">All Offline</span>
            <span className="font-mono font-bold text-zinc-900">({counts.allOffline})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-zinc-700">Partial Offline</span>
            <span className="font-mono font-bold text-zinc-900">({counts.offline})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#237227]" />
            <span className="text-zinc-700">Online</span>
            <span className="font-mono font-bold text-zinc-900">({counts.operational})</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
          {isFullscreen && (
            <span className="text-zinc-500 font-sans hidden md:inline">
              Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-300 text-zinc-700 font-mono text-[10px]">Esc</kbd> to exit
            </span>
          )}
          <span>Showing {counts.total} mapped sites across Mindanao</span>
        </div>
      </div>
    </div>
  );
};
