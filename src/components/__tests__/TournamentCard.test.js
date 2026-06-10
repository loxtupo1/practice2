import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TournamentCard from '../TournamentCard.vue';

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  increment: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('../../firebase', () => ({
  db: { app: 'test-db' },
}));

vi.mock('firebase/firestore', () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  doc: mocks.doc,
  increment: mocks.increment,
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
}));

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};

const tournament = {
  id: 'tournament-1',
  name: 'Spring Cup',
  game: 'CS2',
  prizePool: 5000,
  registeredTeams: 4,
  maxTeams: 16,
  status: 'active',
};

const mountCard = (props = {}) => mount(TournamentCard, {
  props: {
    tournament,
    isAuthenticated: true,
    userId: 'user-1',
    userName: 'Player One',
    ...props,
  },
  global: {
    stubs: {
      RouterLink: RouterLinkStub,
    },
  },
});

describe('TournamentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mocks.collection.mockReturnValue('registrations-collection');
    mocks.doc.mockReturnValue('tournament-ref');
    mocks.increment.mockReturnValue('increment-value');
    mocks.serverTimestamp.mockReturnValue('server-timestamp');
    mocks.addDoc.mockResolvedValue({ id: 'registration-1' });
    mocks.updateDoc.mockResolvedValue();
  });

  it('renders tournament information and detail link', () => {
    const wrapper = mountCard();

    expect(wrapper.text()).toContain('CS2');
    expect(wrapper.text()).toContain('Spring Cup');
    expect(wrapper.text()).toMatch(/\$5\s*000/);
    expect(wrapper.find('a[href="/tournament/tournament-1"]').exists()).toBe(true);
  });

  it('shows login link for anonymous users', () => {
    const wrapper = mountCard({ isAuthenticated: false });

    expect(wrapper.find('a[href="/login"]').exists()).toBe(true);
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('disables registration when tournament is full', () => {
    const wrapper = mountCard({
      tournament: {
        ...tournament,
        registeredTeams: 16,
        maxTeams: 16,
      },
    });

    const button = wrapper.find('button');

    expect(button.attributes('disabled')).toBeDefined();
    expect(wrapper.find('.tournament-status').classes()).toContain('status-closed');
  });

  it('registers authenticated user and emits registered event', async () => {
    const wrapper = mountCard();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(mocks.collection).toHaveBeenCalledWith({ app: 'test-db' }, 'registrations');
    expect(mocks.addDoc).toHaveBeenCalledWith('registrations-collection', expect.objectContaining({
      tournamentId: 'tournament-1',
      tournamentName: 'Spring Cup',
      game: 'CS2',
      userId: 'user-1',
      userName: 'Player One',
      status: 'pending',
      createdAt: 'server-timestamp',
    }));
    expect(mocks.doc).toHaveBeenCalledWith({ app: 'test-db' }, 'tournaments', 'tournament-1');
    expect(mocks.updateDoc).toHaveBeenCalledWith('tournament-ref', {
      registeredTeams: 'increment-value',
    });
    expect(mocks.increment).toHaveBeenCalledWith(1);
    expect(wrapper.emitted('registered')).toHaveLength(1);
    expect(alert).toHaveBeenCalledWith('Успешная регистрация!');
  });
});
