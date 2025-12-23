import ChangePasswordCard from "../_components/change-password-card";
import SessionsCard from "../_components/sessions-card";

export default function Page() {
	return (
		<div className="space-y-8">
			<ChangePasswordCard />
			<SessionsCard />
		</div>
	);
}
