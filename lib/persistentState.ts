
type StorageType = 'sessionStorage' | 'localStorage' | 'cookie';
type CookieEntry = [string, string];
type StorageImplementationType = Storage | CookieStorage;


/**
 * An absolutely overengineered solution but it looks nice when in use
 */
class CookieStorage {
	getItem(key: string) {
		const entries: CookieEntry[] = document.cookie.split('; ').map(item => item.split('=', 2) as CookieEntry);
		const cookie = entries.find(item => item[0] === key)?.[1];
		return cookie ? decodeURIComponent(cookie) : null;
	};
	setItem(key: string, value: string, expires?: Date) {
		const valueEncoded = encodeURIComponent(value);
		const cookieExpiration = expires || new Date(new Date().getTime() + 1_209_600_000);
		document.cookie = `${key}=${valueEncoded}; expires=${cookieExpiration.toUTCString()}`;
	};
	removeItem(key: string) {
		this.setItem(key, '', new Date(0));
	};
};

export class PersistentStateRef<T> {

	_internal_value: T;
	_watchers: Array<(newValue: T) => void> = [];
	_storage_type: StorageType;
	_record_name: string;
	_storage?: StorageImplementationType;

	constructor(initValue: T, record_name: string, type?: StorageType) {

		this._internal_value = initValue;
		this._storage_type = type || 'sessionStorage';
		this._record_name = record_name;

		this.hydrate();
	};

	hydrate() {

		if (typeof window == 'undefined') return false;

		switch (this._storage_type) {

			case 'cookie':
				this._storage = new CookieStorage();
				break;

			case 'localStorage':
				this._storage = localStorage;
				break;
			
			case 'sessionStorage':
				this._storage = sessionStorage;
				break;
		
			default: throw new Error('Unknown storage type');
		}

		try {

			let stateString = this._storage.getItem(this._record_name);
			if (stateString) this._internal_value = JSON.parse(stateString);
			return true;

		} catch (_error) {
			console.error(`Failed to restore PersistentStateRef for: "${this._record_name}"`);
			return false;
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
			if (this._storage_type === 'localStorage' || this._storage_type === 'sessionStorage') {
				(this._storage_type === 'sessionStorage' ? sessionStorage : localStorage).setItem(this._record_name, stateString);
			}
			else if (this._storage_type === 'cookie') {
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
