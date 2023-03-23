import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerminalComponentComponent } from './terminal-component.component';

describe('TerminalComponentComponent', () => {
  let component: TerminalComponentComponent;
  let fixture: ComponentFixture<TerminalComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TerminalComponentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TerminalComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
