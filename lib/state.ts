
export class StateRef<T> {

	private m_internal_value: T;
	private m_subscribers: Array<(newValue: T) => void> = [];

	constructor(initValue: T) {
		this.m_internal_value = initValue;
	};

	watch(watcher: (newValue: T) => void) {
		if (this.m_subscribers.some(item => item === watcher)) return;
		this.m_subscribers.push(watcher);
	};

	unwatch(watcher: () => void) {
		this.m_subscribers = this.m_subscribers.filter(item => item !== watcher);
	};

	get value() {
		return this.m_internal_value;
	};

	set value(newValue: T) {

		this.m_internal_value = newValue;

		this.m_subscribers = this.m_subscribers.filter(item => item);

		for (const callback of this.m_subscribers) {
			try {
				callback(this.m_internal_value);
			} catch (error) {
				console.error('StateRef watcher callback error:', error);
			}
		}
	};
};
