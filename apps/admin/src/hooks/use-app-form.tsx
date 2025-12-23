"use client";

import { createFormHook } from "@tanstack/react-form";
import {
	NumberField,
	SelectField,
	SubscribeButton,
	TextArea,
	TextField,
} from "@/components/form";
import { ImageUploadField } from "@/components/image-upload-field";
import { fieldContext, formContext } from "@/contexts/form-context";

export const { useAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextField,
		TextArea,
		SelectField,
		NumberField,
		ImageUploadField,
	},
	formComponents: {
		SubscribeButton,
	},
});
