import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogsSeguridad } from './logs-seguridad';

describe('LogsSeguridad', () => {
  let component: LogsSeguridad;
  let fixture: ComponentFixture<LogsSeguridad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogsSeguridad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogsSeguridad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
