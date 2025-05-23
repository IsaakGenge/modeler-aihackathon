import { TestBed } from '@angular/core/testing';

import { ToolsPanelStateService } from './tool-panel-state.service';

describe('ToolsPanelStateService', () => {
  let service: ToolsPanelStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolsPanelStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
