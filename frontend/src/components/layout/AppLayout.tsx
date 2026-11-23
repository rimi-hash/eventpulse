import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { YasVoiceAssistant } from '../yas/YasVoiceAssistant';
import { AssistantAppContextProvider } from '../../context/AssistantAppContext';

export const AppLayout: React.FC = () => {
  return (
    <AssistantAppContextProvider>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Navbar />
        <main style={{ flex: 1, paddingBottom: '4rem' }}>
          <Outlet />
        </main>
        <Footer />
        <YasVoiceAssistant />
      </div>
    </AssistantAppContextProvider>
  );
};
