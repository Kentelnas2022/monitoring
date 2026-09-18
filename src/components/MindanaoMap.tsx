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
  Minimize2,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import type * as LType from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveMindanaoSiteLocation, NORTHERN_MINDANAO_CENTER, NORTHERN_MINDANAO_DEFAULT_ZOOM } from '@/lib/geoUtils';

interface MindanaoMapProps {
  sites: SiteInfrastructure[];
  onSelectSite: (site: SiteInfrastructure) => void;
  onOpenSiteDetails?: (site: SiteInfrastructure) => void;
  onClosePopup?: () => void;
  selectedSiteId?: string | null;
  flyToTrigger?: number;
  resetZoomTrigger?: number;
  alertingSiteId?: string | null;
  isTvMode?: boolean;
  isPanelCollapsed?: boolean;
}

// Center coordinates for Northern Mindanao (Region 10: Lanao del Norte, Misamis Occidental, Misamis Oriental, Camiguin, Bukidnon)
const MINDANAO_CENTER: [number, number] = NORTHERN_MINDANAO_CENTER;
const DEFAULT_ZOOM = NORTHERN_MINDANAO_DEFAULT_ZOOM;

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
  onClosePopup,
  selectedSiteId,
  flyToTrigger,
  resetZoomTrigger,
  alertingSiteId,
  isTvMode = false,
  isPanelCollapsed = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LType.Map | null>(null);
  const tileLayerRef = useRef<LType.TileLayer | null>(null);
  const markersLayerRef = useRef<LType.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, LType.Marker>>(new Map());
  const activePopupSiteIdRef = useRef<string | null>(null);
  const isDirectMapClickRef = useRef<boolean>(false);
  const onClosePopupRef = useRef(onClosePopup);
  onClosePopupRef.current = onClosePopup;

  const [mapReady, setMapReady] = useState<boolean>(false);
  const [activeMapType, setActiveMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Filter/Map sites ensuring all have valid coordinates for Leaflet marker & zoom display
  const sitesWithCoords = useMemo(() => {
    return sites.map((s) => {
      let lat = Number(s.coordinates?.lat);
      let lng = Number(s.coordinates?.lng);
      if (!lat || !lng || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        const resolved = resolveMindanaoSiteLocation(s.name, s.id);
        lat = resolved.lat;
        lng = resolved.lng;
      }
      return {
        ...s,
        coordinates: { lat, lng },
      };
    });
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

    // Rich Colored Status Badge
    let badgeBg = '#ecfdf5';
    let badgeColor = '#15803d';
    let badgeBorder = '#bbf7d0';
    let badgeDot = '#16a34a';
    let badgeText = 'Online';

    if (isAllOffline) {
      badgeBg = '#fef2f2';
      badgeColor = '#b91c1c';
      badgeBorder = '#fecaca';
      badgeDot = '#ef4444';
      badgeText = `All Offline (${site.offlineCount}/${site.deviceCount})`;
    } else if (isPartialOffline) {
      badgeBg = '#fffbeb';
      badgeColor = '#b45309';
      badgeBorder = '#fde68a';
      badgeDot = '#f59e0b';
      badgeText = `Offline (${site.offlineCount}/${site.deviceCount})`;
    }

    // Location calculation
    const locationParts = [site.municipality, site.province].filter(Boolean);
    const locationStr = locationParts.length > 0 
      ? Array.from(new Set(locationParts)).join(', ') 
      : (site.region || 'Region 10');

    // AP / Device status calculation from authentic Ruijie Cloud metrics
    const totalDevices = site.deviceCount || ((site.onlineCount || 0) + (site.offlineCount || 0)) || 1;
    const onlineDevices = site.onlineCount !== undefined ? site.onlineCount : Math.max(0, totalDevices - (site.offlineCount || 0));
    const offlineDevices = site.offlineCount || 0;

    const totalAps = site.apCount !== undefined && site.apCount > 0 ? site.apCount : totalDevices;
    const offlineAps = (site.apOffline !== undefined && site.apCount && site.apCount > 0) ? site.apOffline : offlineDevices;
    const onlineAps = Math.max(0, totalAps - offlineAps);

    let apStatusDisplay = '';
    let apStatusColor = '#237227';

    if (offlineAps === 0) {
      apStatusDisplay = `${onlineAps}/${totalAps} Online`;
      apStatusColor = '#237227';
    } else if (offlineAps === totalAps) {
      apStatusDisplay = `${offlineAps}/${totalAps} Offline`;
      apStatusColor = '#dc2626';
    } else {
      apStatusDisplay = `${onlineAps}/${totalAps} Online (${offlineAps} Offline)`;
      apStatusColor = '#d97706';
    }

    // Contact info formatting (phone and social media on separate rows)
    const handler = site.assignedHandler;
    const phone = handler?.phone?.trim() || '';
    const rawSocial = handler?.socialMedia || (handler?.telegram ? `@${handler.telegram.replace(/^@/, '')}` : '');
    const hasPlatform = rawSocial.includes(':') && !rawSocial.startsWith('@');
    const socialPlatform = hasPlatform ? rawSocial.split(':')[0] : 'Social Media';
    const socialHandle = hasPlatform 
      ? rawSocial.split(':').slice(1).join(':').trim() 
      : rawSocial.trim();

    // Device serial number and model
    const offlineDev = site.devices?.find((d) => d.status === 'Offline');
    const dev = offlineDev || site.devices?.[0];
    const deviceSn = dev?.serialNumber || (site.code === 'RJ-9588688' || site.name === 'OJT' ? 'G1QH3N710075C' : 'N/A');
    const modelDisplay = dev?.model || (site.code === 'RJ-9588688' || site.name === 'OJT' ? 'EW1200' : 'Ruijie Device');

    // Site Code format (e.g. RJ - 9588688)
    const rawCode = site.code || (site.name === 'OJT' ? 'RJ-9588688' : '');
    const formattedCode = rawCode ? (rawCode.includes('RJ') ? rawCode.replace(/^RJ-?/, 'RJ - ') : rawCode) : '';

    return `
      <div style="padding: 12px 14px; font-family: Arial, -apple-system, sans-serif; min-width: 260px; color: #18181b; line-height: 1.4; background: #ffffff;">
        <!-- Project Name, Code & Status Badge Row -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; padding-right: 16px;">
          <div style="display: flex; flex-direction: column; min-width: 0;">
            <span style="font-size: 15px; font-weight: 800; color: #09090b; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${site.name}
            </span>
            ${formattedCode ? `
              <span style="font-size: 11px; font-weight: 700; color: #64748b; line-height: 1.3; font-family: monospace; margin-top: 2px;">
                ${formattedCode}
              </span>
            ` : ''}
          </div>
          <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; padding: 2.5px 8px; border-radius: 9999px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; flex-shrink: 0; white-space: nowrap; margin-top: 1px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${badgeDot};"></span>
            ${badgeText}
          </span>
        </div>
        
        <!-- Data Rows -->
        <div style="padding-top: 8px; border-top: 1px solid #f4f4f5; display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">Location:</span>
            <span style="font-weight: 700; color: #18181b; text-align: right; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${locationStr}
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">Downtime:</span>
            <span style="font-weight: 700; color: ${isOffline ? '#dc2626' : '#237227'};">
              ${isOffline ? (site.downtimeDuration || 'Just now') : '0m (Operational)'}
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">AP Device:</span>
            <span style="font-weight: 700; color: ${apStatusColor};">
              ${apStatusDisplay}
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">IP Address:</span>
            <span style="font-family: monospace; font-weight: 700; color: #18181b;">${site.lastKnownIp || 'N/A'}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">Model:</span>
            <span style="font-weight: 700; color: #18181b;">${modelDisplay}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">Device SN:</span>
            <span style="font-family: monospace; font-weight: 700; color: #18181b;">${deviceSn}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">Contact Person:</span>
            <span style="font-weight: 700; color: #18181b;">${site.assignedHandler?.name || 'Field Team'}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">Phone Number:</span>
            <span style="font-weight: 700; color: #18181b;">${phone || 'N/A'}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #71717a;">Social Media:</span>
            <span style="font-weight: 700; color: #18181b;">${socialHandle || 'N/A'}</span>
          </div>
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

      let closeZoomTimer: any = null;

      map.on('popupopen', (e: any) => {
        clearTimeout(closeZoomTimer);
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

        // When user closes popup (clicks the 'x' button), zoom out to Mindanao regional overview & close site details
        clearTimeout(closeZoomTimer);
        closeZoomTimer = setTimeout(() => {
          if (!activePopupSiteIdRef.current) {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
              mapInstanceRef.current.flyTo(MINDANAO_CENTER, DEFAULT_ZOOM, { duration: 1.0 });
            }
            onClosePopupRef.current?.();
          }
        }, 120);
      });

      // Official Google Maps Roadmap Tiles
      const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? `&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` : '';
      const googleTileLayer = L.tileLayer(`https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}${googleKey}`, {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps',
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
      const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? `&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` : '';
      const newLayer = L.tileLayer(`https://mt{s}.google.com/vt/lyrs=${layerType}&x={x}&y={y}&z={z}${googleKey}`, {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps',
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
          // Update location dynamically if coordinates changed
          if (site.coordinates) {
            existingMarker.setLatLng([site.coordinates.lat, site.coordinates.lng]);
          }

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
            if (mapInstanceRef.current && site.coordinates) {
              mapInstanceRef.current.invalidateSize();
              mapInstanceRef.current.flyTo([site.coordinates.lat, site.coordinates.lng], 16, {
                duration: 1.0,
              });
            }
            onSelectSite(site);
          });

          marker.addTo(markersLayer);
          markersMapRef.current.set(site.id, marker);
        }
      });
    });
  }, [sitesWithCoords, alertingSiteId, mapReady, onSelectSite, generatePopupContent]);

  // AUTO-LOCATE AND ACCURATELY VIEW DOWNTIME SITE AREA (triggers when Test Site Down is clicked)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !alertingSiteId) return;
    const targetSite = sitesWithCoords.find((s) => s.id === alertingSiteId);
    if (targetSite?.coordinates) {
      const map = mapInstanceRef.current;
      map.flyTo([targetSite.coordinates.lat, targetSite.coordinates.lng], 14, {
        duration: 1.2,
      });

      const openPopupAction = () => {
        const marker = markersMapRef.current.get(targetSite.id);
        if (marker) {
          activePopupSiteIdRef.current = targetSite.id;
          marker.openPopup();
        }
      };

      map.once('moveend', openPopupAction);
      const timer = setTimeout(openPopupAction, 1300);
      return () => {
        map.off('moveend', openPopupAction);
        clearTimeout(timer);
      };
    }
  }, [alertingSiteId, mapReady, sitesWithCoords]);

  // Fly to selected site from table with street-level zoom (16) and open popup
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !selectedSiteId) return;

    if (isDirectMapClickRef.current) {
      isDirectMapClickRef.current = false;
      return;
    }

    const targetSite = sitesWithCoords.find((s) => s.id === selectedSiteId);
    if (targetSite?.coordinates) {
      const map = mapInstanceRef.current;
      map.invalidateSize();
      map.flyTo([targetSite.coordinates.lat, targetSite.coordinates.lng], 16, {
        duration: 1.2,
      });

      const openPopupAction = () => {
        const marker = markersMapRef.current.get(targetSite.id);
        if (marker) {
          activePopupSiteIdRef.current = targetSite.id;
          marker.openPopup();
        }
      };

      map.once('moveend', openPopupAction);
      const timer = setTimeout(openPopupAction, 1300);
      return () => {
        map.off('moveend', openPopupAction);
        clearTimeout(timer);
      };
    }
  }, [selectedSiteId, flyToTrigger, mapReady, sitesWithCoords]);

  // AUTO-ZOOM OUT & RECENTER MAP WHEN COLLAPSE / EXPAND TOGGLE IS CLICKED
  const isPanelCollapseInitialRef = useRef(true);
  useEffect(() => {
    if (isPanelCollapseInitialRef.current) {
      isPanelCollapseInitialRef.current = false;
      return;
    }
    if (!mapReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    activePopupSiteIdRef.current = null;
    map.closePopup();

    // Smoothly invalidate size and zoom out to Mindanao regional overview
    const t1 = setTimeout(() => {
      map.invalidateSize();
    }, 60);

    const t2 = setTimeout(() => {
      map.invalidateSize();
      map.flyTo(MINDANAO_CENTER, DEFAULT_ZOOM, { duration: 1.0 });
    }, 200);

    const t3 = setTimeout(() => {
      map.invalidateSize();
    }, 550);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isPanelCollapsed, mapReady]);

  // ZOOM OUT ON MINDANAO REGIONAL OVERVIEW WHEN RESET TRIGGER FIRES (e.g. Back icon clicked in Site Inspector)
  useEffect(() => {
    if (!resetZoomTrigger || !mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    activePopupSiteIdRef.current = null;
    map.closePopup();
    map.invalidateSize();
    map.flyTo(MINDANAO_CENTER, DEFAULT_ZOOM, { duration: 1.0 });
  }, [resetZoomTrigger, mapReady]);

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

  // Collapsible Map Controls (Open / Close features, closed by default)
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);

  return (
    <div 
      className={`flex flex-col h-full overflow-hidden bg-white transition-all duration-200 ${
        isFullscreen 
          ? 'fixed inset-0 z-[9990] w-full h-full rounded-none shadow-2xl' 
          : 'relative rounded-2xl border border-zinc-200 shadow-xs'
      }`}
    >
      {/* Main Map Viewport with Clean Floating Controls Overlay */}
      <div className="relative flex-1 min-h-0 w-full bg-[#f8fafc] overflow-hidden">
        {/* Leaflet 2D Roadmap & Satellite View */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-full absolute inset-0 z-0" 
        />

        {/* Collapsible Floating Map Controls (Top Right Overlay) */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
          {/* Controls Container (Smooth spring slide & fade expansion) */}
          <div 
            className={`flex items-center gap-2 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-right overflow-hidden ${
              isControlsOpen 
                ? 'max-w-[420px] opacity-100 scale-100 translate-x-0 pointer-events-auto' 
                : 'max-w-0 opacity-0 scale-95 translate-x-3 pointer-events-none'
            }`}
          >
            {/* Map / Satellite Toggle */}
            <div className="flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 p-0.5 rounded-xl text-[11px] font-semibold shadow-md shrink-0">
              <button
                type="button"
                onClick={() => handleToggleMapType('roadmap')}
                className={`px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                  activeMapType === 'roadmap'
                    ? 'bg-[#237227] text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => handleToggleMapType('satellite')}
                className={`px-2.5 py-1 rounded-lg transition-all duration-150 cursor-pointer ${
                  activeMapType === 'satellite'
                    ? 'bg-[#237227] text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* Zoom & Reset Toolbar */}
            <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-0.5 shadow-md shrink-0">
              <button 
                type="button" 
                onClick={handleZoomIn} 
                className="p-1.5 rounded-lg text-slate-600 hover:text-[#237227] hover:bg-slate-100 active:scale-95 transition-all duration-150 cursor-pointer" 
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button 
                type="button" 
                onClick={handleZoomOut} 
                className="p-1.5 rounded-lg text-slate-600 hover:text-[#237227] hover:bg-slate-100 active:scale-95 transition-all duration-150 cursor-pointer" 
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button 
                type="button" 
                onClick={handleResetZoom} 
                className="p-1.5 rounded-lg text-slate-600 hover:text-[#237227] hover:bg-slate-100 active:scale-95 transition-all duration-150 cursor-pointer" 
                title="Reset to Mindanao Center"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Fullscreen Button */}
            <button 
              type="button" 
              onClick={handleToggleFullscreen} 
              className={`flex items-center justify-center h-8 w-8 rounded-xl border text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer shadow-md shrink-0 ${
                isFullscreen 
                  ? 'bg-[#237227] text-white border-[#237227] hover:bg-[#1e6021]' 
                  : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200/90 hover:text-[#237227] hover:bg-slate-50 hover:border-slate-300'
              }`}
              title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
              aria-label={isFullscreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Open / Close Features Toggle Icon Button (Smooth Spring Rotation & Color Morph) */}
          <button
            type="button"
            onClick={() => setIsControlsOpen((prev) => !prev)}
            className={`flex items-center justify-center h-8 w-8 rounded-xl border text-xs font-bold transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 cursor-pointer shadow-md shrink-0 select-none ${
              isControlsOpen
                ? 'bg-[#237227] text-white border-[#237227] hover:bg-[#1e6021] shadow-emerald-900/15'
                : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200/90 hover:text-[#237227] hover:bg-slate-50 hover:border-slate-300'
            }`}
            title={isControlsOpen ? "Hide Map Controls" : "Show Map Controls"}
            aria-label={isControlsOpen ? "Hide Map Controls" : "Show Map Controls"}
          >
            <Layers 
              className={`h-4 w-4 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                isControlsOpen 
                  ? 'rotate-180 scale-105 text-white' 
                  : 'rotate-0 scale-100'
              }`} 
            />
          </button>
        </div>
      </div>
    </div>
  );
};
