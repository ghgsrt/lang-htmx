import { placeholders } from '..';
import { Safe } from '../types/types';

type Args<F extends (...args: any) => any> = Parameters<F>['length'] extends 0
	? {
			args?: never;
	  }
	: {
			args: Parameters<F>;
	  };

export function Placeholder<
	F extends keyof typeof placeholders,
	K extends string
>(props: { for: F; pKey: K } & Args<(typeof placeholders)[F][K]>) {
	return (
		<div id={`${String(props.pKey)}-placeholder`} class='placeholder'>
			{/*@ts-ignore -- Parameters returns an array ftlog 🤦🏻‍♂️ */}
			{placeholders[props.for][String(props.pKey)](...props.args) as Safe}
		</div>
	);
}
