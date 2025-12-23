import EmailCard from "./_components/email-card";
import UsernameCard from "./_components/username-card";

export default function Page() {
	return (
		<div className="space-y-8">
			<UsernameCard />
			<EmailCard />
		</div>
	);
}
