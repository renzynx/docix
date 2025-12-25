"use client";

import { Button } from "@docix/ui/components/button";
import { TextField as BaseTextField } from "@docix/ui/hooks/form-fields";
import Link from "next/link";
import type { ComponentProps } from "react";

export {
	NumberField,
	SelectField,
	SubscribeButton,
	SwitchField,
	TextArea,
} from "@docix/ui/hooks/form-fields";

export function TextField({
	showForgotPassword = false,
	...props
}: {
	showForgotPassword?: boolean;
} & ComponentProps<typeof BaseTextField>) {
	return (
		<BaseTextField
			{...props}
			showPasswordToggle={props.type === "password"}
			labelExtra={
				showForgotPassword ? (
					<Button
						variant="link"
						nativeButton={false}
						render={<Link href="/auth/forgot-password">Forgot password?</Link>}
					/>
				) : undefined
			}
		/>
	);
}
