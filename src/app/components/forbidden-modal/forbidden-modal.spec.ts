import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForbiddenModal } from './forbidden-modal';

describe('ForbiddenModal', () => {
  let component: ForbiddenModal;
  let fixture: ComponentFixture<ForbiddenModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForbiddenModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForbiddenModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
