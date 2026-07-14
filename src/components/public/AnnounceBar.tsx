import { Link } from "react-router-dom";

export function AnnounceBar() {
  return (
    <div className="announce">
      ✦ <b>Now in early access</b> — the free forever tier is open. <Link to="/pricing">See pricing →</Link>
    </div>
  );
}
