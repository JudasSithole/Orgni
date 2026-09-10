/**
 * Brand marks for the systems Orgni connects to.
 *
 * Hand-authored SVGs in each product's real colours — kept simple and
 * consistent (24x24 viewBox, sized by `size`). Used across onboarding,
 * Connections and the Overview status card.
 */
import type { ReactElement, SVGProps } from "react";

type IconProps = { size?: number } & Omit<SVGProps<SVGSVGElement>, "width" | "height">;

function Svg({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---- Microsoft ---------------------------------------------------- */

export function MicrosoftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </Svg>
  );
}
export { MicrosoftIcon as Microsoft365Icon };

export function TeamsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="17.4" cy="5" r="2.6" fill="#5059C9" />
      <path
        fill="#5059C9"
        d="M20.5 8.5h1.9c.9 0 1.6.7 1.6 1.6v4.6a3.9 3.9 0 0 1-7.8 0V8.5h4.3z"
      />
      <circle cx="11.2" cy="4.6" r="3.4" fill="#7B83EB" />
      <path
        fill="#7B83EB"
        d="M4.2 8.2h13.1c.6 0 1.1.5 1.1 1.1v7.2a7.2 7.2 0 0 1-14.4 0V9.3c0-.6.5-1.1 1.2-1.1z"
      />
      <path
        fill="#fff"
        d="M6.6 10.6h8.3v1.9h-3.1v7.6H9.7v-7.6H6.6z"
      />
    </Svg>
  );
}

export function OutlookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="10.5" y="4.5" width="12" height="15" rx="1.4" fill="#0A2767" />
      <rect x="10.5" y="4.5" width="12" height="7.5" rx="1.4" fill="#0364B8" />
      <path fill="#28A8EA" d="M22.5 8.2 16 12l6.5 3.8V8.2z" />
      <path fill="#0078D4" d="m11 7 5.5 3.3L22 7v1.4L16.5 12 11 8.4z" />
      <rect x="1.5" y="6.5" width="13" height="11" rx="1.6" fill="#0078D4" />
      <path
        fill="#fff"
        d="M8 8.7c2 0 3.3 1.4 3.3 3.4S10 15.5 8 15.5 4.7 14.1 4.7 12 6 8.7 8 8.7zm0 1.8c-.9 0-1.5.7-1.5 1.6s.6 1.6 1.5 1.6 1.5-.7 1.5-1.6-.6-1.6-1.5-1.6z"
      />
    </Svg>
  );
}

export function SharePointIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="7.5" r="5.5" fill="#036C70" />
      <circle cx="15.5" cy="13" r="5" fill="#1A9BA1" />
      <circle cx="10.5" cy="18" r="4" fill="#37C6D0" />
      <path
        fill="#fff"
        d="M9.6 5.2c1.4 0 2.3.5 2.8 1l-.8 1.2c-.5-.4-1.1-.6-1.8-.6-.6 0-1 .2-1 .6 0 .5.6.6 1.4.9 1.1.3 2.4.8 2.4 2.3 0 1.5-1.2 2.4-3 2.4-1.4 0-2.5-.5-3.1-1.2l.9-1.2c.5.5 1.3.9 2.2.9.7 0 1.1-.3 1.1-.7 0-.5-.6-.7-1.4-.9-1.1-.3-2.3-.8-2.3-2.2 0-1.4 1.2-2.3 3-2.3z"
      />
    </Svg>
  );
}

export function OneDriveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="#0364B8"
        d="M13.2 8.7 9.6 5.9a6 6 0 0 0-9.3 3.4A4.7 4.7 0 0 0 4.7 18h5.6l4.2-5z"
      />
      <path
        fill="#0078D4"
        d="M14.6 8.9a4.4 4.4 0 0 0-2.6.9l1.2.8-2.2 5H20a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-6-1.5z"
      />
      <path
        fill="#1490DF"
        d="M11.4 18h8.2a4 4 0 0 0 3.4-1.9l-6.8-6.9-6.2 5.5z"
      />
      <path
        fill="#28A8EA"
        d="M4.7 18h6.7l3.9-4.7-1.1-3.6L4.7 18z"
      />
    </Svg>
  );
}

/* ---- Salesforce, SAP, Xero -------------------------------------- */

export function SalesforceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="#00A1E0"
        d="M10.4 6.6a4 4 0 0 1 6.7 1 3.6 3.6 0 0 1 1.5-.3 3.7 3.7 0 0 1 0 7.4H7.3a4.3 4.3 0 0 1-1-8.5 4 4 0 0 1 4.1.4z"
      />
    </Svg>
  );
}

export function SapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <defs>
        <linearGradient id="sap-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#00AEEF" />
          <stop offset="1" stopColor="#0058A9" />
        </linearGradient>
      </defs>
      <path fill="url(#sap-g)" d="M1 6h22v12H1z" />
      <path
        fill="#fff"
        d="M4.3 9.2h2.4l2.4 5.6h-.02l-.6-1.5H6.2l-.4 1.1H4l1.9-4.8-.1-.4H4.3V9.2zm2 1.7-.6 1.7h1.2l-.6-1.7zm3.8-1.7h2.2c1.1 0 1.9.6 1.9 1.7 0 1-.8 1.7-1.9 1.7h-.9v1.4h-1.3V9.2zm1.3 1v1.4h.7c.4 0 .7-.3.7-.7s-.3-.7-.7-.7h-.7zm3.6-1h2.3c1.2 0 2 .5 2 1.4 0 .6-.4 1-.9 1.2v.02c.7.1 1.1.6 1.1 1.3 0 1-.9 1.5-2.2 1.5h-2.3V9.2zm1.3.9v1h.9c.4 0 .6-.2.6-.5s-.2-.5-.6-.5h-.9zm0 1.8v1.1h1c.4 0 .7-.2.7-.6s-.3-.5-.7-.5h-1z"
      />
    </Svg>
  );
}

export function XeroIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" fill="#13B5EA" />
      <path
        fill="#fff"
        d="m9.8 12 2-2a.9.9 0 1 0-1.3-1.3l-2 2-2-2A.9.9 0 0 0 5.2 10l2 2-2 2a.9.9 0 1 0 1.3 1.3l2-2 2 2A.9.9 0 0 0 12 15l-2-2z"
      />
      <circle cx="16.4" cy="12" r="1.4" fill="#fff" />
    </Svg>
  );
}

/* ---- Google -------------------------------------------------------- */

export function GoogleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 14a6 6 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.9L6.4 14z"
      />
      <path
        fill="#EA4335"
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.6L6.4 10A6 6 0 0 1 12 6z"
      />
    </Svg>
  );
}
export { GoogleIcon as GoogleWorkspaceIcon };

export function GoogleDriveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fill="#0066DA" d="M4.7 20 1 13.6 8.5 1l3.7 6.4z" />
      <path fill="#00AC47" d="M4.7 20h14.6L23 13.6H8.3z" />
      <path fill="#FFBA00" d="m19.3 20 3.7-6.4L15.5 1H8.5l7.5 12.6z" />
      <path fill="#00832D" d="M8.3 13.6 12.2 7.4 8.5 1 4.6 7.4z" opacity=".01" />
      <path fill="#2684FC" d="M12.2 7.4 8.3 13.6h7.7z" opacity=".01" />
    </Svg>
  );
}

export function GmailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fill="#4285F4" d="M2 6.5A1.5 1.5 0 0 1 3.5 5H5v14H3.5A1.5 1.5 0 0 1 2 17.5z" />
      <path fill="#34A853" d="M22 6.5A1.5 1.5 0 0 0 20.5 5H19v14h1.5a1.5 1.5 0 0 0 1.5-1.5z" />
      <path fill="#EA4335" d="M5 5v14h3V9.7l4 3 4-3V19h3V5l-7 5.2z" opacity=".01" />
      <path fill="#FBBC04" d="M5 5v3.2l7 5.2 7-5.2V5l-7 5.2z" />
      <path fill="#C5221F" d="M5 5l7 5.2V13L5 8z" />
      <path fill="#C5221F" d="M19 5l-7 5.2V13l7-5z" />
      <path fill="#EA4335" d="M5 8v11h3v-8.5L5 8zm14 0-3 2.5V19h3z" />
    </Svg>
  );
}

/* ---- neutral fallbacks ------------------------------------------ */

export function DatabaseBrandIcon({ size = 20, ...rest }: IconProps) {
  return (
    <Svg size={size} {...rest}>
      <ellipse cx="12" cy="5.5" rx="7" ry="3" fill="#64748B" />
      <path fill="#64748B" d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6c0 1.7-3.1 3-7 3s-7-1.3-7-3z" />
      <path fill="#475569" d="M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6c0 1.7-3.1 3-7 3s-7-1.3-7-3z" />
    </Svg>
  );
}

export function ApiBrandIcon({ size = 20, ...rest }: IconProps) {
  return (
    <Svg size={size} {...rest}>
      <rect x="2" y="4" width="20" height="16" rx="3" fill="#0F172A" />
      <path
        stroke="#38BDF8"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 9-3 3 3 3m6-6 3 3-3 3"
      />
    </Svg>
  );
}

export function CrmBrandIcon({ size = 20, ...rest }: IconProps) {
  return (
    <Svg size={size} {...rest}>
      <rect x="2" y="3" width="20" height="18" rx="3" fill="#7C3AED" />
      <circle cx="12" cy="9.5" r="3" fill="#fff" />
      <path fill="#fff" d="M6 18a6 6 0 0 1 12 0v.5H6z" />
    </Svg>
  );
}

/* ---- lookup helpers ------------------------------------------- */

const CONNECTION_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  "microsoft-365": MicrosoftIcon,
  salesforce: SalesforceIcon,
  sap: SapIcon,
  xero: XeroIcon,
  "google-workspace": GoogleIcon,
  "custom-api": ApiBrandIcon,
};

export function ConnectionLogo({
  connectionKey,
  size = 24,
  className,
}: {
  connectionKey: string;
  size?: number;
  className?: string;
}) {
  const Icon = CONNECTION_ICONS[connectionKey] ?? ApiBrandIcon;
  return <Icon size={size} className={className} />;
}

const SERVICE_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  teams: TeamsIcon,
  outlook: OutlookIcon,
  calendar: OutlookIcon,
  sharepoint: SharePointIcon,
  onedrive: OneDriveIcon,
  gmail: GmailIcon,
  drive: GoogleDriveIcon,
  "google drive": GoogleDriveIcon,
  "microsoft 365": MicrosoftIcon,
  database: DatabaseBrandIcon,
  crm: CrmBrandIcon,
  "custom api": ApiBrandIcon,
  custom: ApiBrandIcon,
};

export function ServiceLogo({
  label,
  size = 18,
  className,
}: {
  label: string;
  size?: number;
  className?: string;
}) {
  const Icon = SERVICE_ICONS[label.trim().toLowerCase()];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
