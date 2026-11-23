import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="container" style={{ paddingTop: '6rem' }}>
      <EmptyState
        icon={<Compass size={48} />}
        title="Page Not Found"
        description="The page or event resource you are looking for does not exist or may have been relocated."
        action={
          <Link to="/">
            <Button variant="primary">Return to Discovery</Button>
          </Link>
        }
      />
    </div>
  );
};
