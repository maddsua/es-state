
type StorageType = 'sessionStorage' | 'localStorage' | 'cookie';

/**
 * An absolutely overengineered solution but it looks nice when in use
 */
class CookieStorage {
	getItem(key: string) {
		const entries = document.cookie.split('; ').map(item => item.split('=', 2) as [string, string]);
		const cookie = entries.find(item => item[0] === key)?.[1];
		return cookie ? decodeURIComponent(cookie) : null;
	};
	setItem(key: string, value: string, expires?: Date) {
		const valueEncoded = encodeURIComponent(value);
		const cookieExpiration = expires || new Date(new Date().getTime() + 1_209_600_000);
		document.cookie = `${key}=${valueEncoded}; expires=${cookieExpiration.toUTCString()}; SameSite=Strict; Secure`;
	};
	removeItem(key: string) {
		this.setItem(key, '', new Date(0));
	};
};

export class PersistentStateRef<T> {

	private m_internal_value: T;
	private m_subscribers: Array<(newValue: T) => void> = [];
	private m_storage_type: StorageType;
	private m_record_name: string;
	private m_storage?: Storage | CookieStorage;
	hydrated: boolean = false;

	constructor(initValue: T, record_name: string, type?: StorageType) {

		this.m_internal_value = initValue;
		this.m_storage_type = type || 'sessionStorage';
		this.m_record_name = record_name;

		this.hydrate();
	};

	private m_readStorage() {

		try {
			let stateString = this.m_storage!.getItem(this.m_record_name);
			if (stateString) this.m_internal_value = JSON.parse(stateString);
		} catch (_error) {
			console.error(`Failed to restore PersistentStateRef for: "${this.m_record_name}"`);
			return false;
		}

		return true;
	}

	private m_writeStorage() {

		try {

			if (typeof this.m_internal_value === 'undefined' || this.m_internal_value === null) {
				this.m_storage!.removeItem(this.m_record_name);
				return true;
			}

			const stateString = JSON.stringify(this.m_internal_value);
			this.m_storage!.setItem(this.m_record_name, stateString);

		} catch (_error) {
			console.error(`Failed to save PersistentStateRef for: "${this.m_record_name}"`);
			return false;
		}

		return true;
	}

	private m_notify() {
		
		this.m_subscribers = this.m_subscribers.filter(item => item);

		for (const callback of this.m_subscribers) {
			try {
				callback(this.m_internal_value);
			} catch (error) {
				console.error('PersistentStateRef watcher callback error:', error);
			}
		}
	};

	/**
	 * Initializes storage when running client-side, otherwise does nothing
	 */
	hydrate() {

		if (typeof window == 'undefined') return false;

		switch (this.m_storage_type) {

			case 'cookie':
				this.m_storage = new CookieStorage();
				break;

			case 'localStorage':
				this.m_storage = localStorage;
				break;
			
			case 'sessionStorage':
				this.m_storage = sessionStorage;
				break;
		
			default: throw new Error('Unknown storage type');
		}

		const readResult = this.m_readStorage();
		if (readResult) {
			this.hydrated = true;
			this.m_notify();
			return true;
		}

		return false;
	};

	/**
	 * Manually sync state
	 */
	sync() {
		this.m_writeStorage();
		this.m_notify();
	}

	/**
	 * Get updates when state changes
	 */
	watch(watcher: (newValue: T) => void) {
		if (this.m_subscribers.some(item => item === watcher)) return;
		this.m_subscribers.push(watcher);
	};

	/**
	 * Stop getting state updates
	 */
	unwatch(watcher: () => void) {
		this.m_subscribers = this.m_subscribers.filter(item => item !== watcher);
	};

	/**
	 * State value
	 */
	get value() {
		return this.m_internal_value;
	};

	/**
	 * State value
	 * Please note that if state is an object an you change one of it's properties you'd need to call sync() after that as for now I did't implement any proxies
	 */
	set value(newValue: T) {
		this.m_internal_value = newValue;
		this.m_writeStorage();
		this.m_notify();
	};
};
