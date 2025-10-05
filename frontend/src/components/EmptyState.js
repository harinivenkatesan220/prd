import React from 'react';

const EmptyState = ({ icon, title, description, action, theme }) => {
  return (
    <div 
      className="text-center py-5"
      style={{ 
        color: theme.colors.textMuted,
        padding: `${theme.spacing.xl} ${theme.spacing.lg}`
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: theme.spacing.md }}>
        {icon}
      </div>
      <h3 style={{ color: theme.colors.text, marginBottom: theme.spacing.sm }}>
        {title}
      </h3>
      <p style={{ marginBottom: theme.spacing.lg }}>
        {description}
      </p>
      {action && action}
    </div>
  );
};

export default EmptyState;
