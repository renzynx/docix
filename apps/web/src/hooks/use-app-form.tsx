"use client";

import { createFormHook } from "@tanstack/react-form";
import { SubscribeButton, TextArea, TextField } from "@/components/form";
import { fieldContext, formContext } from "@/contexts/form-context";

export const { useAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextField,
		TextArea,
	},
	formComponents: {
		SubscribeButton,
	},
});
