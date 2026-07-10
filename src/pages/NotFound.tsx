import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '../components/ui';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="n-page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <EmptyState
        icon="search"
        title="Página no encontrada"
        message="La ruta que buscas no existe o fue movida."
        action={
          <Button icon="home" onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        }
      />
    </div>
  );
}
