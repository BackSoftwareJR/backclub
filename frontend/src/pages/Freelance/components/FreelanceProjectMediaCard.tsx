import React, { useMemo, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { FolderKanban } from 'lucide-react';
import type { FreelanceProject } from '../../../types/freelance';

type FreelanceProjectMediaCardProps = {
  project: FreelanceProject;
  displayName: string;
  statusLabel: string;
  statusColor: string;
  progress: number;
  taskCount: number;
  dueDate: string | null;
  onClick: () => void;
};

const appleEase = [0.25, 0.46, 0.45, 0.94] as const;

const getProjectInitial = (name: string): string => {
  const clean = name.trim();
  return clean.length > 0 ? clean.charAt(0).toUpperCase() : 'P';
};

const getCoverImage = (project: FreelanceProject): string | null => {
  return project.cover_photo_url ?? project.cover_photo ?? null;
};

const FreelanceProjectMediaCard: React.FC<FreelanceProjectMediaCardProps> = ({
  project,
  displayName,
  statusLabel,
  statusColor,
  progress,
  taskCount,
  dueDate,
  onClick,
}) => {
  const coverImage = getCoverImage(project);
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : coverImage;
  const clientName = project.client?.company_name;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 180, damping: 26, mass: 0.7 });
  const smoothY = useSpring(pointerY, { stiffness: 180, damping: 26, mass: 0.7 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [1.8, -1.8]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-2.2, 2.2]);
  const floatingCoverY = useTransform(smoothY, [-0.5, 0.5], [4, -4]);
  const floatingCoverX = useTransform(smoothX, [-0.5, 0.5], [3, -3]);
  const hasDueDate = useMemo(() => Boolean(dueDate), [dueDate]);

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    pointerX.set(x);
    pointerY.set(y);
  };

  const handleMouseLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.button
      type="button"
      className="fp-media-card"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -5, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      style={{ rotateX, rotateY, transformPerspective: 1100 }}
      transition={{ duration: 0.24, ease: appleEase }}
    >
      {/* Full-bleed image layer */}
      <motion.div
        className="fp-media-card-cover-wrap"
        style={{ x: floatingCoverX, y: floatingCoverY }}
      >
        {imageUrl ? (
          <motion.img
            src={imageUrl}
            alt={`Copertina ${displayName}`}
            className="fp-media-card-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
            whileHover={{ scale: 1.07 }}
            transition={{ duration: 0.5, ease: appleEase }}
          />
        ) : (
          <div
            className="fp-media-card-cover fp-media-card-cover--fallback"
            style={{ '--fp-accent': project.crmDepartment?.color ?? statusColor } as React.CSSProperties}
          >
            <div className="fp-media-card-fallback-glow" />
            <div className="fp-media-card-fallback-pattern" />
            <span className="fp-media-card-fallback-initial">
              {getProjectInitial(displayName)}
            </span>
          </div>
        )}
      </motion.div>

      {/* Gradient veil — dark at bottom for text, light at top */}
      <div className="fp-media-card-veil" />

      {/* Status badge — glassmorphism pill, top-right */}
      <span
        className="fp-media-card-status"
        style={{ '--fp-status-color': statusColor } as React.CSSProperties}
      >
        <span className="fp-media-card-status-dot" />
        {project.is_project_manager ? `${statusLabel} · PM` : statusLabel}
      </span>

      {/* Title + meta overlaid at card bottom */}
      <div className="fp-media-card-bottom">
        <h3 className="fp-media-card-title">{displayName}</h3>
        <p className="fp-media-card-client">{clientName || 'Cliente non assegnato'}</p>
        <div className="fp-media-card-meta">
          <span className="fp-media-card-meta-item">{taskCount} task</span>
          <span className="fp-media-card-meta-sep" />
          <span className="fp-media-card-meta-item">
            {hasDueDate ? `Scade ${dueDate}` : 'Senza scadenza'}
          </span>
          <span className="fp-media-card-progress-label">{clampedProgress}%</span>
        </div>
      </div>

      {/* 3px progress bar pinned to card bottom edge */}
      <motion.div
        className="fp-media-card-progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${clampedProgress}%` }}
        transition={{ duration: 0.5, ease: appleEase }}
        style={{ backgroundColor: statusColor }}
      />

      {/* Hover affordance indicator */}
      <div className="fp-media-card-hover-indicator">
        <FolderKanban size={14} />
      </div>
    </motion.button>
  );
};

export default FreelanceProjectMediaCard;
