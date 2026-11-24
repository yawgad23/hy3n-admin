import { ShieldCheck, ShieldOff } from "lucide-react";
import {
  accountLifecycleActions,
  accountLifecycleConfirmation,
} from "@/lib/accountLifecycle";

export default function AccountLifecycleActions({
  account,
  role,
  busy,
  onAction,
}) {
  const actions = accountLifecycleActions(account.accountStatus);
  return (
    <div
      data-testid="account-lifecycle-actions"
      className="flex flex-wrap gap-2"
    >
      {actions.map((action) => {
        const Icon = action.id === "release" ? ShieldCheck : ShieldOff;
        return (
          <button
            key={action.id}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => {
              const confirmation = accountLifecycleConfirmation(
                action,
                account,
                role,
              );
              if (window.confirm(confirmation)) onAction(action);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50 ${action.id === "release" ? "border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10" : "border-red-500/40 text-red-200 hover:bg-red-500/10"}`}
          >
            <Icon size={13} /> {action.label}
          </button>
        );
      })}
      {!actions.length && (
        <span className="text-xs text-muted-foreground">
          Refresh to confirm account access.
        </span>
      )}
    </div>
  );
}
