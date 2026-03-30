import { Stage } from '../Stage/Stage';
import styles from './Roadmap.module.css';

interface RoadmapProps {
  stage: 1 | 2 | 3 | 4;
  size?: 'L' | 'S';
  onStageClick?: (stage: 1 | 2 | 3 | 4) => void;
}

const STAGES = [
  { iconName: 'calendar' as const, label: 'Способ и время\nполучения' },
  { iconName: 'comment' as const, label: 'Настройка сборки\nзаказа' },
  { iconName: 'payment' as const, label: 'Выбор способа\nоплаты' },
  { iconName: 'confirm' as const, label: 'Подтверждение\nзаказа' },
] as const;

function getLineGradient(activeStage: 1 | 2 | 3 | 4): string {
  const primary = 'var(--ctx-color-action-primary)';
  const subtle = 'var(--ctx-color-bg-subtle)';
  if (activeStage === 1) return subtle;
  if (activeStage === 2) return `linear-gradient(to right, ${primary} 0%, ${primary} 33.33%, ${subtle} 33.33%, ${subtle} 100%)`;
  if (activeStage === 3) return `linear-gradient(to right, ${primary} 0%, ${primary} 66.66%, ${subtle} 66.66%, ${subtle} 100%)`;
  return primary;
}

export function Roadmap({ stage, size = 'L', onStageClick }: RoadmapProps) {
  const lineStyle = size === 'L'
    ? { left: '80px', right: '80px' }
    : { left: '32px', right: '32px' };

  return (
    <div className={[styles.root, styles[`size${size}`]].join(' ')}>
      <div
        className={styles.line}
        style={{
          ...lineStyle,
          background: getLineGradient(stage),
        }}
      />
      {STAGES.map((s, i) => {
        const stageNum = (i + 1) as 1 | 2 | 3 | 4;
        return (
          <div
            key={stageNum}
            className={onStageClick ? styles.clickable : ''}
            onClick={onStageClick ? () => onStageClick(stageNum) : undefined}
          >
            <Stage
              iconName={s.iconName}
              label={s.label}
              state={stageNum === stage ? 'activated' : 'enabled'}
              size={size}
            />
          </div>
        );
      })}
    </div>
  );
}
