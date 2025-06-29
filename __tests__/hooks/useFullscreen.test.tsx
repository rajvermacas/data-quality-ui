import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from '@/hooks/useFullscreen';

describe('useFullscreen', () => {
  let mockElement: HTMLDivElement;
  let originalDocument: any;

  beforeEach(() => {
    mockElement = document.createElement('div');
    originalDocument = global.document;

    // Mock fullscreen API
    mockElement.requestFullscreen = jest.fn().mockResolvedValue(undefined);
    
    // Mock document methods
    Object.defineProperty(document, 'exitFullscreen', {
      value: jest.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true
    });

    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true
    });

    Object.defineProperty(document, 'fullscreenEnabled', {
      value: true,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.document = originalDocument;
  });

  it('should initialize with isFullscreen as false', () => {
    const { result } = renderHook(() => 
      useFullscreen({ current: mockElement })
    );

    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.fullscreenEnabled).toBe(true);
  });

  it('should enter fullscreen when enterFullscreen is called', async () => {
    const { result } = renderHook(() => 
      useFullscreen({ current: mockElement })
    );

    await act(async () => {
      await result.current.enterFullscreen();
    });

    expect(mockElement.requestFullscreen).toHaveBeenCalled();
  });

  it('should exit fullscreen when exitFullscreen is called', async () => {
    const { result } = renderHook(() => 
      useFullscreen({ current: mockElement })
    );

    // Set fullscreen state to true
    Object.defineProperty(document, 'fullscreenElement', {
      value: mockElement,
      writable: true,
      configurable: true
    });

    await act(async () => {
      await result.current.exitFullscreen();
    });

    expect(document.exitFullscreen).toHaveBeenCalled();
  });

  it('should toggle fullscreen state', async () => {
    const { result } = renderHook(() => 
      useFullscreen({ current: mockElement })
    );

    // Toggle to enter fullscreen
    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockElement.requestFullscreen).toHaveBeenCalled();

    // Mock fullscreen active
    act(() => {
      result.current.isFullscreen = true;
    });

    // Toggle to exit fullscreen
    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(document.exitFullscreen).toHaveBeenCalled();
  });

  it('should handle fullscreen change events', () => {
    const { result } = renderHook(() => 
      useFullscreen({ current: mockElement })
    );

    // Simulate fullscreen change
    Object.defineProperty(document, 'fullscreenElement', {
      value: mockElement,
      writable: true,
      configurable: true
    });

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(result.current.isFullscreen).toBe(true);
  });

  it('should handle null element ref', async () => {
    const { result } = renderHook(() => 
      useFullscreen({ current: null })
    );

    await act(async () => {
      await result.current.enterFullscreen();
    });

    expect(mockElement.requestFullscreen).not.toHaveBeenCalled();
  });

  it('should handle fullscreen API errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockElement.requestFullscreen = jest.fn().mockRejectedValue(new Error('Fullscreen denied'));

    const { result } = renderHook(() => 
      useFullscreen({ current: mockElement })
    );

    await act(async () => {
      await result.current.enterFullscreen();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to enter fullscreen:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should support webkit prefix', () => {
    // Remove standard API
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: undefined,
      writable: true,
      configurable: true
    });

    // Add webkit API
    Object.defineProperty(document, 'webkitFullscreenElement', {
      value: null,
      writable: true,
      configurable: true
    });

    mockElement.webkitRequestFullscreen = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => 
      useFullscreen({ current: mockElement })
    );

    expect(result.current.fullscreenEnabled).toBe(true);
  });

  it('should handle browsers without fullscreen support', () => {
    // Remove all fullscreen APIs
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: undefined,
      writable: true,
      configurable: true
    });
    Object.defineProperty(document, 'webkitFullscreenElement', {
      value: undefined,
      writable: true,
      configurable: true
    });
    Object.defineProperty(document, 'mozFullScreenElement', {
      value: undefined,
      writable: true,
      configurable: true
    });
    Object.defineProperty(document, 'msFullscreenElement', {
      value: undefined,
      writable: true,
      configurable: true
    });

    const { result } = renderHook(() => 
      useFullscreen({ current: mockElement })
    );

    expect(result.current.fullscreenEnabled).toBe(false);
  });
});