import Elysia, { ModelValidator, t } from 'elysia';
import { Safe } from '../types/types';

type ModalActions = {
	onConfirm: (() => void) | ((body: Parameters<Elysia['post']>[1]) => void);
	onCancel: (() => void) | ((body: Parameters<Elysia['delete']>[1]) => void);
};
const modalActions: Record<string, ModalActions | undefined> = {};

export const modal = (app: Elysia) =>
	app.guard(
		{
			cookie: t.Object({ userId: t.String() }),
			afterResponse: ({ cookie }) =>
				(modalActions[cookie.userId.value] = undefined),
		},
		(app) =>
			app
				.post('/modal', (context) =>
					modalActions[context.cookie.userId.value]!.onConfirm(context)
				)
				.delete('/modal', (context) =>
					modalActions[context.cookie.userId.value]!.onCancel(context)
				)
	);

export default function Modal({
	uid,
	message,
	warning,
	alert,
	error,
	onConfirm,
	onCancel,
	target,
	children,
}: {
	uid: string;
	message: string;
	warning?: string;
	alert?: string;
	error?: string;
	onConfirm: ModalActions['onConfirm'];
	onCancel?: ModalActions['onCancel'];
	target?: string;
	children?: JSX.Element;
}) {
	modalActions[uid] = {
		onConfirm: onConfirm,
		onCancel: onCancel ?? (() => {}),
	};

	return (
		<>
			<div role='oob-slave'></div>
			<div
				id='modal'
				class={`${warning ? 'warning' : ''} ${alert ? 'alert' : ''} ${
					error ? 'modal-error' : ''
				}`}
				hx-swap-oob='true'
			>
				<script>{`setTimeout(() => { const input = document.getElementById('modal').querySelector('input'); input?.focus(); })`}</script>
				<div class='messages'>
					<h2 safe>{message}</h2>
					{warning && (
						<small class='warning' safe>
							warning: {warning}
						</small>
					)}
					{alert && (
						<small class='alert' safe>
							alert: {alert}
						</small>
					)}
					{error && <small class='modal-error'>error: {error}</small>}
				</div>
				<form
					hx-post='/modal'
					hx-trigger='submit'
					hx-target={target}
					hx-on:htmx-after-request="if (event.detail.successful) document.getElementById('modal').replaceChildren();"
				>
					{children as Safe}
					<div class='buttons'>
						<button type='submit'>confirm</button>
						<button hx-delete='/modal'>cancel</button>
					</div>
				</form>
			</div>
		</>
	);
}
