import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApplicationContext } from '../types/assistant';

export interface AssistantAppContextType {
  context: ApplicationContext;
  setPageContext: (ctx: Partial<ApplicationContext>) => void;
  clearPageContext: () => void;
  registerSeatSelectionHandler: (handler: (seatIds: string[], seatLabels?: string[]) => void) => () => void;
  registerQuantityHandler: (handler: (quantity: number) => void) => () => void;
  triggerSeatSelection: (seatIds: string[], seatLabels?: string[]) => void;
  triggerQuantityUpdate: (quantity: number) => void;
  getFullApplicationContext: () => ApplicationContext;
}

const AssistantAppContext = createContext<AssistantAppContextType | null>(null);

export const AssistantAppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [pageContext, setPageContextState] = useState<Partial<ApplicationContext>>({});

  const seatSelectionHandlersRef = React.useRef<Set<(seatIds: string[], seatLabels?: string[]) => void>>(new Set());
  const quantityHandlersRef = React.useRef<Set<(qty: number) => void>>(new Set());

  const setPageContext = useCallback((ctx: Partial<ApplicationContext>) => {
    setPageContextState((prev) => ({ ...prev, ...ctx }));
  }, []);

  const clearPageContext = useCallback(() => {
    setPageContextState({});
  }, []);

  const registerSeatSelectionHandler = useCallback((handler: (seatIds: string[], seatLabels?: string[]) => void) => {
    seatSelectionHandlersRef.current.add(handler);
    return () => {
      seatSelectionHandlersRef.current.delete(handler);
    };
  }, []);

  const registerQuantityHandler = useCallback((handler: (qty: number) => void) => {
    quantityHandlersRef.current.add(handler);
    return () => {
      quantityHandlersRef.current.delete(handler);
    };
  }, []);

  const triggerSeatSelection = useCallback((seatIds: string[], seatLabels?: string[]) => {
    seatSelectionHandlersRef.current.forEach((handler) => {
      try {
        handler(seatIds, seatLabels);
      } catch (err) {
        console.warn('Seat selection handler error:', err);
      }
    });
  }, []);

  const triggerQuantityUpdate = useCallback((quantity: number) => {
    quantityHandlersRef.current.forEach((handler) => {
      try {
        handler(quantity);
      } catch (err) {
        console.warn('Quantity update handler error:', err);
      }
    });
  }, []);

  // Compute pageType based on route
  const pageType = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path === '/events') return 'EXPLORE';
    if (path.startsWith('/events/')) return 'EVENT_DETAIL';
    if (path.startsWith('/checkout/')) return 'CHECKOUT';
    if (path.includes('/confirmation')) return 'ORDER_CONFIRMATION';
    if (path === '/my-tickets') return 'MY_TICKETS';
    if (path === '/my-orders') return 'MY_ORDERS';
    if (path === '/organizer') return 'ORGANIZER';
    if (path === '/resale') return 'RESALE';
    if (path === '/venue-studio') return 'VENUE_STUDIO';
    if (path === '/scanner') return 'SCANNER';
    if (path === '/admin') return 'ADMIN';
    if (path === '/login') return 'LOGIN';
    return 'OTHER';
  }, [location.pathname]);

  const getFullApplicationContext = useCallback((): ApplicationContext => {
    return {
      currentPath: location.pathname,
      pageType,
      isAuthenticated: !!user,
      userRole: user?.role,
      ...pageContext,
    };
  }, [location.pathname, pageType, user, pageContext]);

  const value = useMemo(
    () => ({
      context: getFullApplicationContext(),
      setPageContext,
      clearPageContext,
      registerSeatSelectionHandler,
      registerQuantityHandler,
      triggerSeatSelection,
      triggerQuantityUpdate,
      getFullApplicationContext,
    }),
    [
      getFullApplicationContext,
      setPageContext,
      clearPageContext,
      registerSeatSelectionHandler,
      registerQuantityHandler,
      triggerSeatSelection,
      triggerQuantityUpdate,
    ]
  );

  return <AssistantAppContext.Provider value={value}>{children}</AssistantAppContext.Provider>;
};

export const useAssistantAppContext = (): AssistantAppContextType => {
  const context = useContext(AssistantAppContext);
  if (!context) {
    throw new Error('useAssistantAppContext must be used within an AssistantAppContextProvider');
  }
  return context;
};
