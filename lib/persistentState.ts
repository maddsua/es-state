
type PersistenceType = 'sessionStorage' | 'localStorage' | 'cookie';

export class PersistentStateRef<T> {

	_internal_value: T;
	_watchers: Array<(newValue: T) => void> = [];
	_persistence_type: PersistenceType;
	_record_name: string;

	constructor(record_name: string, type?: PersistenceType, initValue?: T) {

		this._internal_value = initValue;
		this._persistence_type = type || 'sessionStorage';
		this._record_name = record_name;

		if (typeof window == 'undefined') return;

		try {

			let stateString: string | undefined = undefined;

			if (type === 'localStorage' || type === 'sessionStorage') {
				stateString = (type === 'sessionStorage' ? sessionStorage : localStorage).getItem(record_name);
			}
			else if (type === 'cookie') {
				const cookies = document.cookie.split('; ').map(item => item.split('=')).map(([key, value]) => ({ key, value}));
				stateString = cookies.find(item => item.key === this._record_name)?.value;
				if (stateString) stateString = decodeURIComponent(stateString);
			}

			stateString ? (this._internal_value = JSON.parse(stateString) as T) : undefined;
		
		} catch (_error) {
			console.error(`Failed to restore PersistentStateRef for: "${record_name}"`);
		}
	};

	watch(watcher: (newValue: T) => void) {
		if (this._watchers.some(item => item === watcher)) return;
		this._watchers.push(watcher);
	};

	unwatch(watcher: (newValue: T) => void) {
		this._watchers = this._watchers.filter(item => item !== watcher);
	};

	get value() {
		return this._internal_value;
	};

	set value(newValue: T) {

		this._internal_value = newValue;
		this._watchers = this._watchers.filter(item => item);
		this._watchers.forEach((watcher) => (async () => watcher(this._internal_value))().catch(error => console.error('StateRef watcher crashed:', error)));

		try {

			const stateString = JSON.stringify(this._internal_value);
			if (this._persistence_type === 'localStorage' || this._persistence_type === 'sessionStorage') {
				(this._persistence_type === 'sessionStorage' ? sessionStorage : localStorage).setItem(this._record_name, stateString);
			}
			else if (this._persistence_type === 'cookie') {
				const stateStringEncoded = encodeURIComponent(stateString);
				const cookieExpiration = new Date(new Date().getTime() + 1_209_600_000);
				const cookieEncodedState = `${this._record_name}=${stateStringEncoded}; expires=${cookieExpiration.toUTCString()}`;
				document.cookie = cookieEncodedState;
			}

		} catch (_error) {
			console.error(`Failed to save PersistentStateRef for: "${this._record_name}"`);
		}
	};
};
