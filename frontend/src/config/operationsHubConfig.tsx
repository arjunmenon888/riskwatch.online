// filepath: frontend/src/config/operationsHubConfig.tsx
import React from 'react';
import {
  WarningAmberOutlined,
  BuildOutlined,
  ListAltOutlined,
  FactCheckOutlined,
  AssignmentOutlined,
  FindInPageOutlined,
  SearchOutlined,
  GavelOutlined,
  BarChartOutlined,
} from '@mui/icons-material';

export interface HubFeature {
  title: string;
  description: string;
  path: string;
  icon: React.ReactElement;
}

export const hubFeatures: HubFeature[] = [
  {
    title: 'Incidents & Near Misses',
    description: 'Track and manage incidents and near misses',
    path: '/operations-hub/incidents',
    icon: <WarningAmberOutlined fontSize="large" />,
  },
  {
    title: 'Work Orders',
    description: 'Create, assign, and monitor work orders',
    path: '/operations-hub/work-orders',
    icon: <BuildOutlined fontSize="large" />,
  },
  {
    title: 'Assets (Critical)',
    description: 'Maintain critical asset information',
    path: '/operations-hub/assets',
    icon: <ListAltOutlined fontSize="large" />,
  },
  {
    title: 'Inspections',
    description: 'Schedule and record inspections',
    path: '/operations-hub/inspections',
    icon: <FactCheckOutlined fontSize="large" />,
  },
  {
    title: 'Permits to Work (PTW)',
    description: 'Oversee change management processes',
    path: '/operations-hub/ptw',
    icon: <AssignmentOutlined fontSize="large" />,
  },
  {
    title: 'Management of Change (MoC)',
    description: 'Oversee change management processes',
    path: '/operations-hub/moc',
    icon: <FindInPageOutlined fontSize="large" />,
  },
  {
    title: 'Investigations & RCA',
    description: 'Conduct investigations and root cause analysis',
    path: '/operations-hub/investigations',
    icon: <SearchOutlined fontSize="large" />,
  },
  {
    title: 'Compliance & Audits',
    description: 'Conduct investigations and root cause analysis',
    path: '/operations-hub/audits',
    icon: <GavelOutlined fontSize="large" />,
  },
  {
    title: 'Analytics',
    description: 'View operational analytics and trends',
    path: '/operations-hub/analytics',
    icon: <BarChartOutlined fontSize="large" />,
  },
];