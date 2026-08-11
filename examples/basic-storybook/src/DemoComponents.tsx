import type { ReactNode } from "react";
import "./demo.css";

export type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary" | "quiet";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({ disabled = false, label, onClick, size = "md", variant = "primary" }: ButtonProps) {
  return (
    <button className={`demo-button demo-button--${variant} demo-button--${size}`} disabled={disabled} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export type BadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning";
};

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  return <span className={`demo-badge demo-badge--${tone}`}>{label}</span>;
}

export type CardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function Card({ children, description, title }: CardProps) {
  return (
    <article className="demo-card">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {children ? <div className="demo-card__footer">{children}</div> : null}
    </article>
  );
}

export type NoticeProps = {
  title: string;
  message: string;
  tone?: "info" | "success";
};

export function Notice({ message, title, tone = "info" }: NoticeProps) {
  return (
    <section className={`demo-notice demo-notice--${tone}`} role="status">
      <strong>{title}</strong>
      <span>{message}</span>
    </section>
  );
}
