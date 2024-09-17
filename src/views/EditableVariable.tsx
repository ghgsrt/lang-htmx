import Html from '@kitajs/html';
import { Safe } from '../types/types';
import { IsMapped, ValueOrArray } from '../types/utils';
import { _broadcast, addGeneratedRoute, Method } from '..';
import { deepClone, defaultVal, replaceKeyOrdered } from '../utils';
import { AutoResizeInput } from '../components/AutoResizeInput';
import { Select } from '../components/Select';
import Modal from '../components/Modal';

export type EditableObject = {
	[key: string]:
		| ValueOrArray<string>
		| ValueOrArray<number>
		| ValueOrArray<boolean>
		| ValueOrArray<EditableObject>;
};
export type EditableValue = EditableObject[string];

//? | {} is to ensure 'object' shows as a default type bc EditableObject is a mapped obj
export type ValidSchemaInput = EditableValue | {};
export type Schema<T extends ValidSchemaInput = ValidSchemaInput> =
	T extends string
		? S.String
		: T extends number
		? S.Number
		: T extends boolean
		? S.Boolean
		: T extends (infer U extends EditableValue)[]
		? S.Array<Schema<U>>
		: T extends EditableObject
		? IsMapped<T> extends true
			? S.VarObject<Schema<T[string]>>
			: S.Object<{ [key in keyof T]-?: Schema<T[key]> }>
		: never;

//? circular dependency hell if just try to use the return types of the functions
export declare namespace S {
	interface Object<T extends {} = Record<string, Any>> {
		type: 'object';
		shape: T;
		options: ObjectOptions;
	}
	interface VarObject<T extends Any = Any> {
		type: 'varObject';
		shape: T;
		options: VarObjectOptions;
	}
	interface Array<T extends Any = Any, O extends ArrayOptions = ArrayOptions> {
		type: 'array';
		shape: T;
		options: O;
	}
	interface String {
		type: 'string';
		options: StringOptions;
	}
	interface Number {
		type: 'number';
		options: NumberOptions;
	}
	interface Boolean {
		type: 'boolean';
		options: BooleanOptions;
	}

	type Any = Object | VarObject | Array | String | Number | Boolean;
}

type Sync<T = undefined> = {
	sync: T extends undefined
		? (newValue?: any, oldValue?: any) => void
		: (newValue: T, oldValue: T) => void;
};
type OptionalSync = {
	syncChildren?: false;
} & Partial<Sync>;
type SyncWithChildren = {
	syncChildren: true;
} & Sync;

type IntrinsicOptions<T = undefined> = {
	tooltip?: string;
	default?: T;
};
type IntrinsicPrimitiveOptions<T extends string | number | boolean> = Partial<
	Sync<T>
> & {
	confirm?: (value: T) => {
		message: string;
		warning?: string;
		alert?: string;
	};
	onAccept?: (value: T) => void;
	onReject?: (value: T) => void;
};
type IntrinsicNonPrimitiveOptions = OptionalSync | SyncWithChildren;

type IntrinsicVariableOptions = {
	onAdd?: (newValue: any) => void;
	onDelete?: (oldValue: any) => void;
};

type ObjectOptions = IntrinsicOptions & IntrinsicNonPrimitiveOptions & {};
type VarObjectOptions = IntrinsicOptions &
	IntrinsicNonPrimitiveOptions &
	IntrinsicVariableOptions & {
		noSpecialInProps?: true;
		onKeyChanged?: (newValue: string, oldValue: string) => void;
	};
type ArrayOptions = IntrinsicOptions &
	IntrinsicNonPrimitiveOptions &
	IntrinsicVariableOptions & {
		noDuplicates?: boolean;
		deleteOnEmpty?: boolean;
	};
type StringOptions = IntrinsicOptions<string> &
	IntrinsicPrimitiveOptions<string> & {
		default?: string;
		restrict?: string[] | [string, string][];
		validate?: (newValue: string, oldValue: string) => boolean;
		validateClient?: [string, string][];
		tooltip?: string;
		type?: 'file';
	};
type NumberOptions = IntrinsicOptions<boolean> &
	IntrinsicPrimitiveOptions<boolean> & {};
type BooleanOptions = IntrinsicOptions<number> &
	IntrinsicPrimitiveOptions<number> & {};

//? could've done some cool shit with this but instead ts decides
//? "type instantiation is excessively deep and possibly infinite" 🙄
type ToType<S extends S.Any> = S extends S.Object
	? { [key in keyof S['shape']]: ToType<S['shape'][key]> }
	: S extends S.VarObject
	? Record<string, ToType<S['shape']>>
	: S extends S.Array
	? ToType<S['shape']>[]
	: S extends S.String
	? string
	: S extends S.Number
	? number
	: S extends S.Boolean
	? boolean
	: any;

export const s = {
	Object: <T extends {}>(shape: T, options?: ObjectOptions): S.Object<T> => ({
		type: 'object' as const,
		shape,
		options: options ?? {},
	}),
	VarObject: <T extends S.Any>(
		valueShape: T,
		options?: VarObjectOptions
	): S.VarObject<T> => ({
		type: 'varObject' as const,
		shape: valueShape,
		options: options ?? {},
	}),
	Array: <T extends S.Any>(
		valueShape: T,
		options?: ArrayOptions
	): S.Array<T> => ({
		type: 'array' as const,
		shape: valueShape,
		options: options ?? {},
	}),
	String: (options?: StringOptions): S.String => ({
		type: 'string' as const,
		options: options ?? {},
	}),
	Number: (options?: NumberOptions): S.Number => ({
		type: 'number' as const,
		options: options ?? {},
	}),
	Boolean: (options?: BooleanOptions): S.Boolean => ({
		type: 'boolean' as const,
		options: options ?? {},
	}),
} as const;
export type S = typeof s;

const _primitives = ['string', 'number', 'boolean'];
const isPrimitive = (schema: S.Any) => _primitives.includes(schema.type);

export const Error = (schema: S.Any, errors: [string, string][]) => {
	const getSquigglyGuy = `const squigglyGuy = this.closest("label");`;
	const tellSquigglyAboutError = `squigglyGuy.dataset.hasError = true;`;
	const tellSquigglyNoError = `squigglyGuy.dataset.hasError = false;`;

	const getErrorContainer = `const errorContainer = squigglyGuy.parentElement${
		isPrimitive(schema) ? '.parentElement' : ''
	}.querySelector(':scope > .settings-error');`;
	// const getErrorContainer = `const errorContainer = squigglyGuy.parentElement.querySelector(':scope > .settings-error');`;

	const displayError = (error: string) =>
		`errorContainer.innerHTML = ${error};`;
	const clearError = `errorContainer.innerHTML = '';`;

	const isError = (message: string) =>
		`${displayError(message)} ${tellSquigglyAboutError}`;
	const noError = `${clearError} ${tellSquigglyNoError}`;

	let checkError = `if (${errors[0][0]}) { ${isError(errors[0][1])} } `;
	for (let i = 1; i < errors.length; i++)
		checkError += `else if (${errors[i][0]}) { ${isError(errors[i][1])} } `;
	checkError += `else { ${noError} }`;

	const instantiateItems = `${getSquigglyGuy} ${getErrorContainer}`;

	return `${instantiateItems} ${checkError};`;
};
Error.Component = ({
	type,
	condition = true,
}: {
	type: 'object' | 'varObject' | 'array' | 'primitive';
	condition?: boolean;
}) => (condition ? <span class={`settings-error type-${type}`}></span> : <></>);

Error.Validate = {
	valueIsNotIncludedIn: (acceptableValues: string[]) =>
		`[${acceptableValues.map(
			(value) => `"${value}"`
		)}].includes(this.value.toString())`,
	valueIsNotEmpty: `this.value.toString() === ''`,
};
const Message = (message: string) => `'${message}'`;
Message.propertyExists = (parentProp: string) =>
	`'\"${parentProp}\" already has property \"' + this.value + '\"...'`;
Message.propertyMustNotBeEmpty = `'this field cannot be empty'`;
Error.Message = Message;

const newValue = (schema: S.Any) => {
	if (schema.type === 'object') {
		const newObj: Record<string, any> = {};
		for (const key in schema.shape) {
			newObj[key] = newValue((schema as S.Object).shape[key]);
		}
		return newObj;
	}

	return Object.hasOwn(schema.options, 'default')
		? schema.options.default
		: defaultVal(schema.type);
};

const depthStyle = (depth: number, condition: boolean = true) =>
	condition
		? ({
				'--depth': depth,
		  } as any)
		: {};

type SchemaComponentProps<
	V extends ValidSchemaInput,
	//@ts-ignore -- Schema<ValidSchemaInput> does not satisfy constraint of Schema<ValidSchemaInput> ??? LMAO fuck this "language"
	S extends Any = Schema<V>
> = {
	value: V;
	schema: S;
	URL: string;
	depth: number;
	useDepth: boolean;
};

export function EditableVariable<V extends ValidSchemaInput>({
	id,
	declaration,
	name,
	readonly,
	value,
	schema: _schema,
	baseURL,
	updateValue,
	rejectValue,
}: {
	id: string;
	declaration: 'const' | 'let' | 'var';
	name: string;
	readonly?: boolean;
	value: V;
	schema: (schemaBuilder: typeof s) => Schema<V>;
	baseURL: string;
	updateValue: () => void;
	rejectValue?: () => void;
}) {
	const schema = _schema(s);

	const trueURL = (URL: string) => `${baseURL}${URL}`;

	//TODO cleanup these route functions yeesh

	const addRoute = (
		method: Method,
		path: string,
		callback: JSX.Element | ((props: Record<string, any>) => boolean | void)
	) =>
		addGeneratedRoute(method, trueURL(path), (props) => {
			if (typeof callback === 'function') {
				const result = callback(props);
				if (result === true || result === undefined) updateValue();
				else rejectValue?.();
			} else return callback;
		});

	//! only for primitives
	const addPATCH = <V extends {} | any[]>(
		URL: string,
		value: V,
		key: keyof V,
		schema: S.Object<V> | S.VarObject | S.Array
	) => {
		if (readonly) return;

		const shape = (schema.type === 'object'
			? schema.shape[key]
			: schema.shape) as unknown as S.String | S.Number | S.Boolean;

		const callback = ({ body }: any) => {
			let _value = body.value.trim();

			if (Object.hasOwn(shape.options, 'validate')) {
				//@ts-ignore -- i'm literally checking, why can't ts just be a half decent "language"
				const result = shape.options.validate(_value, value[key]);
				if (!result) return false;
			}

			if (body.type === 'number') _value = Number(_value);
			if (body.type === 'boolean') {
				_value = _value === 'on' ? true : false;
			}

			const oldValue = value[key];

			value[key] = _value;
			//@ts-ignore -- it literally knows sync here wants a string, bool, or number, yet it says "can't be assigned to never" my god 🤦🏻‍♂️
			shape.options?.sync?.(_value, oldValue);
			if (schema.options?.syncChildren) schema.options.sync(_value, oldValue);
			if (
				schema.type === 'array' &&
				schema.options?.deleteOnEmpty &&
				_value === ''
			)
				(value as any[]).splice((value as any[]).indexOf(''), 1);

			return true;
		};

		if (shape.options?.confirm) {
			addGeneratedRoute('patch', trueURL(URL), (props) => {
				const _value = (props.body as any).value.trim();

				const { message, warning, alert } = shape.options.confirm!(
					//@ts-ignore
					_value as any
				);
				return (
					<Modal
						uid={props.room.user.id}
						onConfirm={() => {
							const result = callback(props);
							if (result) {
								//@ts-ignore -- dogshit "language"
								shape.options.onAccept?.(_value);
								updateValue();
							} else {
								//@ts-ignore -- dogshit "language"
								shape.options.onReject?.(_value);
								rejectValue?.();
							}

							props.room.flush();
						}}
						message={message}
						warning={warning}
						alert={alert}
					/>
				);
			});
		} else
			addGeneratedRoute('patch', trueURL(URL), (props) => {
				const result = callback(props);
				const _value = (props.body as any).value.trim();
				if (result) {
					//@ts-ignore -- dogshit "language"
					shape.options?.onAccept?.(_value);
					updateValue();
				} else {
					//@ts-ignore -- dogshit "language"
					shape.options?.onReject?.(_value);
					rejectValue?.();
				}
			});
	};

	const _Infer = {
		object: _Object,
		varObject: _VarObject,
		array: _Array,
		string: _Primitive,
		number: _Primitive,
		boolean: _Primitive,
	};
	function Infer(props: SchemaComponentProps<ValidSchemaInput, S.Any>) {
		//@ts-ignore -- trust the process baby
		return _Infer[props.schema.type](props);
	}

	function Declare() {
		const blockFormatted =
			(schema.type === 'object' && Object.entries(value as {}).length > 0) ||
			(schema.type === 'varObject' && Object.entries(value as {}).length > 0) ||
			(schema.type === 'array' && (value as any[]).length > 3);

		const Tag = blockFormatted ? 'div' : 'span';

		return (
			<div id={id}>
				<Tag class={blockFormatted ? 'settings-variable' : ''}>
					<span class='settings-declaration'>{declaration}</span>{' '}
					<span class='settings-variable' safe>
						{name}
					</span>{' '}
					<span class='settings-declaration'>=</span>{' '}
					{blockFormatted ? (
						<>
							<span class='settings-bracket'>
								{schema.type === 'array' ? '[' : '{'}
							</span>
							<Error.Component type={schema.type} />
						</>
					) : (
						''
					)}
				</Tag>
				<Infer
					value={value}
					schema={schema as S.Any}
					URL=''
					depth={0}
					useDepth={false}
				/>
			</div>
		);
	}

	function _Array({
		value,
		schema,
		URL,
		depth,
		useDepth,
	}: SchemaComponentProps<EditableValue[]>) {
		const shouldBlockFormat = value.length > 3;

		if (!readonly) {
			addRoute('post', URL, () => {
				const _new = newValue(schema.shape);
				value.push(_new);

				schema.options?.onAdd?.(_new);
				schema.options?.sync?.(_new);
			});
			for (const i in value) {
				addRoute('delete', `${URL}/${i}`, () => {
					const _old = value[Number(i)];
					value.splice(Number(i), 1);

					schema.options?.onDelete?.(_old);
					schema.options?.sync?.(defaultVal(schema.shape.type), _old);
				});
				if (isPrimitive(schema.shape))
					addPATCH(`${URL}/${i}`, value, Number(i), schema);
			}
		}

		const ContentTag = shouldBlockFormat ? 'div' : 'span';
		const ClosingTag = shouldBlockFormat ? 'p' : 'span';

		let noMoreToAdd = false;
		if (
			schema.shape.type === 'string' &&
			schema.shape.options.restrict !== undefined
		) {
			if (schema.shape.options.restrict.length === 0) noMoreToAdd = true;
		}

		return (
			<span class='variable-item'>
				{!shouldBlockFormat ? (
					<span style={depthStyle(depth, useDepth)} class='settings-bracket'>
						[
					</span>
				) : (
					''
				)}
				<ContentTag
					class={`settings-string ${
						shouldBlockFormat ? 'settings-object' : ''
					}`}
				>
					{value.map((_value, i) => (
						<ContentTag class='variable-property'>
							{!readonly && (
								<span
									style={depthStyle(depth + 4, shouldBlockFormat)}
									class={`remove ${shouldBlockFormat ? '' : 'inline'}`}
									hx-delete={`${trueURL(URL)}/${i}`}
									hx-trigger='click'
									hx-swap='none'
								>
									-
								</span>
							)}
							<Infer
								value={_value}
								schema={schema.shape}
								URL={`${URL}/${i}`}
								depth={depth + Number(shouldBlockFormat) * 4}
								useDepth={shouldBlockFormat}
							/>
							<span>{i !== value.length - 1 ? ', ' : ''}</span>
							<Error.Component type={'array'} condition={shouldBlockFormat} />
						</ContentTag>
					))}
				</ContentTag>
				<ClosingTag
					style={depthStyle(depth, shouldBlockFormat)}
					class='settings-bracket'
				>
					]
				</ClosingTag>
				{!readonly && !noMoreToAdd && (
					<p
						class='add'
						hx-post={trueURL(URL)}
						hx-trigger='click'
						hx-swap='none'
						hx-target='this'
					>
						+
					</p>
				)}
			</span>
		);
	}

	function _Object({
		value,
		schema,
		URL,
		depth,
	}: SchemaComponentProps<EditableObject, S.Object<Record<string, any>>>) {
		const entries = Object.entries(schema.shape);

		for (const [key] of entries) {
			if (value[key] === undefined) value[key] = newValue(schema.shape[key]);

			if (!readonly && isPrimitive(schema.shape[key]))
				addPATCH(`${URL}/${key}`, value, key, schema);
		}
		const blockFormatted = (key: string) =>
			(schema.shape[key].type === 'object' &&
				Object.entries(value[key] as {}).length > 0) ||
			(schema.shape[key].type === 'varObject' &&
				Object.entries(value[key] as {}).length > 0) ||
			(schema.shape[key].type === 'array' && (value[key] as any[]).length > 3);

		return entries.length > 0 ? (
			<>
				<div class='settings-object depth-marker'>
					{entries.map(([key, _value], i) => (
						<div
							class={`${
								blockFormatted(key) ? 'block-formatted' : 'settings-variable'
							}`}
						>
							<_Property
								name={key}
								value={value[key]}
								schema={schema.shape[key as keyof typeof value]}
								URL={`${URL}/${key}`}
								depth={depth + 4}
								useDepth={true}
							/>
							<span>{i !== entries.length - 1 ? ',' : ''}</span>
							<Error.Component type={'object'} />
						</div>
					))}
				</div>
				<p style={depthStyle(depth)} class='settings-bracket'>
					{'}'}
				</p>
			</>
		) : (
			<>
				<span class='settings-bracket'>{'{}'}</span>
			</>
		);
	}

	function _VarObject({
		value,
		schema,
		URL,
		depth,
		useDepth,
	}: SchemaComponentProps<EditableObject>) {
		const entries = Object.entries(value);
		const prefix = URL.split('/').pop() + '-';

		if (!readonly) {
			addRoute('post', `${URL}`, () => {
				let x = 0;
				while (Object.hasOwn(value, prefix + x)) x++;

				const _new = newValue(schema.shape);
				value[(prefix + x) as keyof typeof value] = _new;

				schema.options?.onAdd?.(_new);
				schema.options?.sync?.(_new);
			});

			entries.map(([key], i) => {
				addRoute('delete', `${URL}/${i}`, () => {
					const _old = deepClone(value[key]);
					delete value[key];

					schema.options?.onDelete?.(_old);
					schema.options?.sync?.(defaultVal(schema.shape.type), _old);
				});
				addRoute('patch', `${URL}/${i}-key`, ({ body }) => {
					if (Object.hasOwn(value, body.value)) return false;

					replaceKeyOrdered(value, key, body.value);

					schema.options?.onKeyChanged?.(body.value, key);
					schema.options?.sync?.();
				});
				if (isPrimitive(schema.shape))
					addPATCH(`${URL}/${i}`, value, key, schema);
			});
		}

		const blockFormatted = (key: string) =>
			//@ts-ignore -- brain too smol
			(schema.shape.type === 'object' &&
				Object.entries(value[key] as {}).length > 0) ||
			(schema.shape.type === 'varObject' &&
				Object.entries(value[key] as {}).length > 0) ||
			(schema.shape.type === 'array' && (value[key] as any[]).length > 3);

		return (
			<span class='variable-item'>
				{entries.length > 0 ? (
					<>
						<div
							class='settings-object depth-marker'
							onclick='event.stopPropagation()'
						>
							{entries.map(([key, _value], i) => (
								<div
									class={`${
										blockFormatted(key)
											? 'block-formatted'
											: 'settings-variable'
									} variable-property`}
								>
									{!readonly && (
										<span
											style={depthStyle(depth + 4)}
											class='remove'
											hx-delete={`${trueURL(URL)}/${i}`}
											hx-trigger='click'
											hx-swap='none'
										>
											-
										</span>
									)}
									<_Property
										value={_value}
										schema={schema.shape}
										URL={`${URL}/${i}`}
										depth={depth + 4}
										useDepth={true}
									>
										<_Primitive
											value={key}
											schema={{
												type: 'string',
												options: {},
											}}
											URL={`${URL}/${i}-key`}
											depth={0}
											useDepth={false}
											validate={Error(schema.shape, [
												[
													Error.Validate.valueIsNotIncludedIn(
														Object.keys(value).filter((_key) => key !== _key)
													),
													Error.Message.propertyExists(prefix.slice(0, -1)),
												],
											])}
										/>
									</_Property>
									<span>{i !== entries.length - 1 ? ',' : ''}</span>
									<Error.Component type={'varObject'} />
								</div>
							))}
						</div>
						<span style={depthStyle(depth)} class='settings-bracket'>
							{'}'}
						</span>

						{!readonly && (
							<p
								class='add'
								hx-post={trueURL(URL)}
								hx-trigger='click'
								hx-swap='none'
								hx-target='this'
							>
								+
							</p>
						)}
					</>
				) : (
					<>
						<span style={depthStyle(depth, useDepth)} class='settings-bracket'>
							{'{}'}
						</span>
						{!readonly && (
							<p
								class='add'
								hx-post={trueURL(URL)}
								hx-trigger='click'
								hx-swap='none'
								hx-target='this'
							>
								+
							</p>
						)}
					</>
				)}
			</span>
		);
	}

	type PropertyWithKey = {
		name: string;
		children?: never;
	};
	type PropertyWithChild = {
		name?: never;
		children: JSX.Element;
	};
	function _Property({
		name,
		value,
		schema,
		URL,
		depth,
		useDepth,
		children,
	}: SchemaComponentProps<ValidSchemaInput> &
		(PropertyWithKey | PropertyWithChild)) {
		const blockFormatted =
			(schema.type === 'object' && Object.entries(value as {}).length > 0) ||
			(schema.type === 'varObject' && Object.entries(value as {}).length > 0) ||
			(schema.type === 'array' && (value as any[]).length > 3);

		const Tag = blockFormatted ? 'div' : 'span';

		return (
			<span
				style={blockFormatted ? {} : depthStyle(depth, useDepth)}
				class={`settings-property type-${schema.type}`}
			>
				<Tag
					title={schema.options?.tooltip}
					style={blockFormatted ? depthStyle(depth, useDepth) : {}}
					class={blockFormatted ? 'settings-variable' : 'settings-for-default'}
				>
					{!readonly &&
						schema.options.default &&
						(schema.type === 'string' || schema.type === 'number') && (
							<>
								<div
									title={`reset value to default (${schema.options.default})`}
									class='settings-to-default'
									hx-patch={trueURL(URL)}
									hx-include='next input'
									hx-swap='none'
									hx-target='this'
								></div>
								<input
									role='value-slave'
									name='value'
									type={schema.type === 'string' ? 'text' : schema.type}
									value={schema.options.default as any}
								/>
							</>
						)}
					{name ? <span safe>{name}</span> : (children as Safe)}
					<span class='settings-special'>:</span>{' '}
					{blockFormatted ? (
						<>
							<span class='settings-bracket'>
								{schema.type === 'array' ? '[' : '{'}
							</span>
							<Error.Component type={schema.type} />
						</>
					) : (
						''
					)}
				</Tag>
				<Infer
					value={value}
					schema={schema}
					URL={URL}
					depth={depth}
					useDepth={false}
				/>
			</span>
		);
	}

	type Primitive = string | number | boolean;
	function _Primitive({
		value: _value,
		schema,
		URL,
		depth,
		useDepth,
		validate,
	}: SchemaComponentProps<Primitive> & {
		validate?: string;
	}) {
		const { type, options } = schema;

		const value = typeof _value === 'number' ? _value.toString() : _value;

		const restricted = type === 'string' && !!options?.restrict;

		return (
			<label style={depthStyle(depth, useDepth)} class={`settings-${type}`}>
				<span
					class={`settings-${type}`}
					style={
						type === 'string' && options?.restrict ? { cursor: 'pointer' } : {}
					}
				>
					{type === 'string' ? '"' : ''}
					<AutoResizeInput
						id={`primitive-${URL}`}
						value={
							restricted && Array.isArray(options!.restrict![0])
								? options.restrict!.find((item) => item[0] === _value)![1]
								: value
						}
						type={type}
						URL={trueURL(URL)}
						oninput={`${validate ?? ''}; ${
							type === 'string' && options?.validateClient
								? Error(schema, options.validateClient)
								: ''
						};`}
						readonly={!!readonly || restricted}
					/>
					{type === 'string' ? '"' : ''}
				</span>
				{type === 'string' && options.restrict !== undefined ? (
					<Select
						dropdownStyle={{
							backgroundColor: 'var(--clr-background)',
							outlineColor: 'var(--clr-foreground)',
						}}
						id={`primitive-${URL}`}
						name='value'
						options={options.restrict!}
						customSelected={{ datasetOnly: true }}
						URL={trueURL(URL)}
						readonly={!!readonly}
						teleport
					/>
				) : (
					''
				)}
				<div
					id={`${URL}-autocomplete`}
					class='settings-autocomplete'
					hx-get={trueURL(URL)}
					hx-target='this'
					hx-swap='innerHTML'
				></div>
			</label>
		);
	}

	return <Declare />;
}
