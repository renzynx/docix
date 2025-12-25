"use client";

import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./form-context";
import {
	NumberField,
	SelectField,
	SubscribeButton,
	SwitchField,
	TextArea,
	TextField,
} from "./form-fields";

export const { useAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextField,
		TextArea,
		SelectField,
		NumberField,
		SwitchField,
	},
	formComponents: {
		SubscribeButton,
	},
});
