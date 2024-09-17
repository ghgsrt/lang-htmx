import Html from '@kitajs/html';
import { Safe } from '../types/types';

export function FormError({ message }: { message: string }) {
	return (
		<div class='form-control-message error' safe>
			{message}
		</div>
	);
}

export function ValidatedInput({
	action,
	validatorAction,
	target,
	swap,
	name,
	placeholder,
	buttonText,
}: {
	action: string;
	validatorAction: string;
	target: string;
	swap: string;
	name: string;
	placeholder: string;
	buttonText: string;
}) {
	return ({
		isValid,
		value,
		children,
	}: {
		isValid: boolean;
		value?: string;
		children?: JSX.Element;
	}) => (
		<form
			class='col mb-2'
			hx-post={action}
			hx-target={isValid ? target : 'this'}
			hx-swap={isValid ? swap : 'outerHTML'}
		>
			<div class='row'>
				<input
					type='text'
					name={name}
					placeholder={placeholder}
					value={value ?? ''}
					aria-invalid={!isValid}
					hx-post={validatorAction}
				/>
				<button type='submit' disabled={!isValid} safe>
					{buttonText}
				</button>
			</div>
			{children as Safe}
		</form>
	);
}
