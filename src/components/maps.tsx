import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { severityIcon, centerIcon, campaignIcon, AREQUIPA_CENTER } from '../lib/leaflet';
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
      {campaigns.map((c) =>
        c.lat != null && c.lng != null ? (
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
        ) : null,
      )}
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
