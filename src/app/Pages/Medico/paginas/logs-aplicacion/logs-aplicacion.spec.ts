import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogsAplicacion } from './logs-aplicacion';

describe('LogsAplicacion', () => {
  let component: LogsAplicacion;
  let fixture: ComponentFixture<LogsAplicacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogsAplicacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogsAplicacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
