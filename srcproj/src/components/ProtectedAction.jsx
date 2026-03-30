export default function ProtectedAction({ allowed, children, fallback = null }) {
  return allowed ? children : fallback;
}
