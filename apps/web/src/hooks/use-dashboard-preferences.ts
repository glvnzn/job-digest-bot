'use client';

import { useState, useEffect } from 'react';

export interface DashboardWidget {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

export interface DashboardPreferences {
  widgets: DashboardWidget[];
  compactMode: boolean;
  refreshInterval: number; // in minutes
  theme: 'light' | 'dark' | 'auto';
}

const defaultPreferences: DashboardPreferences = {
  widgets: [
    { id: 'stats', name: 'Overview Stats', enabled: true, order: 0 },
    { id: 'quickActions', name: 'Quick Actions', enabled: true, order: 1 },
    { id: 'charts', name: 'Analytics Charts', enabled: true, order: 2 },
    { id: 'activity', name: 'Recent Activity', enabled: true, order: 3 },
    { id: 'trackedJobs', name: 'Tracked Jobs', enabled: true, order: 4 },
    { id: 'insights', name: 'Career Insights', enabled: true, order: 5 },
  ],
  compactMode: false,
  refreshInterval: 5,
  theme: 'auto'
};

const PREFERENCES_KEY = 'dashboard-preferences';

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsedPrefs = JSON.parse(stored);
        // Merge with defaults to handle new preferences
        setPreferences({
          ...defaultPreferences,
          ...parsedPrefs,
          widgets: parsedPrefs.widgets || defaultPreferences.widgets
        });
      }
    } catch (error) {
      console.warn('Failed to load dashboard preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (newPreferences: DashboardPreferences) => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save dashboard preferences:', error);
    }
  };

  // Update specific preference
  const updatePreference = <K extends keyof DashboardPreferences>(
    key: K,
    value: DashboardPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  };

  // Toggle widget visibility
  const toggleWidget = (widgetId: string) => {
    const newWidgets = preferences.widgets.map(widget =>
      widget.id === widgetId 
        ? { ...widget, enabled: !widget.enabled }
        : widget
    );
    updatePreference('widgets', newWidgets);
  };

  // Reorder widgets
  const reorderWidgets = (newOrder: DashboardWidget[]) => {
    updatePreference('widgets', newOrder);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    localStorage.removeItem(PREFERENCES_KEY);
    setPreferences(defaultPreferences);
  };

  // Get enabled widgets in order
  const enabledWidgets = preferences.widgets
    .filter(widget => widget.enabled)
    .sort((a, b) => a.order - b.order);

  return {
    preferences,
    isLoaded,
    enabledWidgets,
    updatePreference,
    toggleWidget,
    reorderWidgets,
    resetToDefaults,
    savePreferences
  };
}