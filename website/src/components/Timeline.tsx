import { PIPELINE, type OrderStatus } from '@/lib/site';
import { Icon } from './Icon';

/** The status pipeline, with everything up to `status` lit. */
export function Timeline({ status, compact = false }: { status: OrderStatus; compact?: boolean }) {
  const index = PIPELINE.findIndex((s) => s.status === status);
  const cancelled = status === 'CANCELLED';
  const done = index < 0 ? -1 : index;
  const pct = done <= 0 ? 0 : (done / (PIPELINE.length - 1)) * 100;

  return (
    <ol className={`timeline ${compact ? 'timeline--compact' : ''} ${cancelled ? 'timeline--cancelled' : ''}`} aria-label="Order progress">
      <div className="timeline__track" aria-hidden="true">
        <div className="timeline__fill" style={{ width: `${pct}%` }} />
      </div>
      {PIPELINE.map((step, i) => {
        const state = cancelled ? 'off' : i < done ? 'done' : i === done ? 'current' : 'todo';
        return (
          <li key={step.status} className={`timeline__step timeline__step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="timeline__dot">{state === 'done' ? <Icon name="check" size={14} /> : null}</span>
            <span className="timeline__label">{step.label}</span>
            {!compact ? <span className="timeline__blurb">{step.blurb}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
