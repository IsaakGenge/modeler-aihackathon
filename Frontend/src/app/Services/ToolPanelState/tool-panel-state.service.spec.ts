import { TestBed } from '@angular/core/testing';

import { ToolPanelStateService } from './tool-panel-state.service';

describe('ToolPanelStateService', () => {
  let service: ToolPanelStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolPanelStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
