"use client";

import { fieldContext, formContext } from "@docix/ui/hooks/form-context";
import {
	NumberField,
	SelectField,
	SubscribeButton,
	SwitchField,
	TextArea,
	TextField,
} from "@docix/ui/hooks/form-fields";
import { createFormHook } from "@tanstack/react-form";
import { ImageUploadField } from "@/components/image-upload-field";

export const { useAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextField,
		TextArea,
		SelectField,
		NumberField,
		SwitchField,
		ImageUploadField,
	},
	formComponents: {
		SubscribeButton,
	},
});
