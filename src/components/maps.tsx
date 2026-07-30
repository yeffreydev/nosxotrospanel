import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { severityIcon, centerIcon, campaignIcon, AREQUIPA_CENTER, CAMPAIGN_COLOR } from '../lib/leaflet';
import { AREQUIPA_DISTRICT_CENTROIDS } from '../lib/geo';
import { formatSoles } from '../lib/format';
import type { Campaign, Center, EmergencyMapPoint } from '../lib/types';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIB = '&copy; OpenStreetMap';

export function OpsMap({
  emergencies = [],
  centers = [],
  campaigns = [],
  height = 480,
  onSelectEmergency,
}: {
  emergencies?: EmergencyMapPoint[];
  centers?: Center[];
  campaigns?: Campaign[];
  height?: number | string;
  onSelectEmergency?: (id: string) => void;
}) {
  return (
    <MapContainer
      center={AREQUIPA_CENTER}
      zoom={12}
      style={{ height, width: '100%', borderRadius: 'var(--r-lg)' }}
      scrollWheelZoom
    >
      <TileLayer url={TILE_URL} attribution={ATTRIB} />
      {emergencies.map((e) =>
        e.lat != null && e.lng != null ? (
          <Marker
            key={`e-${e.id}`}
            position={[e.lat, e.lng]}
            icon={severityIcon(e.severity)}
            eventHandlers={onSelectEmergency ? { click: () => onSelectEmergency(e.id) } : undefined}
          >
            <Popup>
              <strong>{e.title}</strong>
              <br />
              {e.needsCount} necesidades · {e.beneficiariesCount} personas
            </Popup>
          </Marker>
        ) : null,
      )}
      {centers.map((c) =>
        c.lat != null && c.lng != null ? (
          <Marker key={`c-${c.id}`} position={[c.lat, c.lng]} icon={centerIcon(c.status)}>
            <Popup>
              <strong>{c.name}</strong>
              <br />
              Carga: {c.loadPct}%
            </Popup>
          </Marker>
        ) : null,
      )}
      {campaigns.map((c) => {
        if (c.lat != null && c.lng != null) {
          return (
            <Marker key={`camp-${c.id}`} position={[c.lat, c.lng]} icon={campaignIcon()}>
              <Popup>
                <strong>{c.title}</strong>
                <br />
                {formatSoles(c.raisedAmount)}
                {c.goalAmount ? ` · ${c.progressPct}%` : ''}
                {c.district ? ` · ${c.district}` : ''}
                <br />
                <Link to={`/campanas/${c.slug}`}>Ver campaña →</Link>
              </Popup>
            </Marker>
          );
        }
        // Sin coordenadas: no hay pin exacto. Si el distrito elegido es de
        // Arequipa, se zonifica con un círculo aproximado sobre su centroide.
        const centroid = c.district ? AREQUIPA_DISTRICT_CENTROIDS[c.district] : undefined;
        if (!centroid) return null;
        return (
          <Circle
            key={`camp-zone-${c.id}`}
            center={[centroid.lat, centroid.lng]}
            radius={1500}
            pathOptions={{ color: CAMPAIGN_COLOR, fillColor: CAMPAIGN_COLOR, fillOpacity: 0.15, weight: 1 }}
          >
            <Popup>
              <strong>{c.title}</strong>
              <br />
              {formatSoles(c.raisedAmount)}
              {c.goalAmount ? ` · ${c.progressPct}%` : ''}
              {' · '}
              {c.district} (ubicación aproximada)
              <br />
              <Link to={`/campanas/${c.slug}`}>Ver campaña →</Link>
            </Popup>
          </Circle>
        );
      })}
    </MapContainer>
  );
}

export function MiniMap({
  lat,
  lng,
  height = 200,
  label,
}: {
  lat: number;
  lng: number;
  height?: number | string;
  label?: string;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      style={{ height, width: '100%', borderRadius: 'var(--r-md)' }}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={TILE_URL} attribution={ATTRIB} />
      <CircleMarker
        center={[lat, lng]}
        radius={10}
        pathOptions={{ color: '#3cc139', fillColor: '#3cc139', fillOpacity: 0.7, weight: 3 }}
      >
        {label && <Popup>{label}</Popup>}
      </CircleMarker>
    </MapContainer>
  );
}
